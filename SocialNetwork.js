// NHẬP THƯ VIỆN FIREBASE TỪ INTERNET (KHÔNG CẦN CÀI NPM)
import {initializeApp} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import {getDatabase, ref, set, onValue, remove} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// CHÌA KHÓA CỦA BẠN (Mình đã thêm databaseURL vào để tránh lỗi)
const firebaseConfig = {
    apiKey: "AIzaSyA5xt8tNQm2A6Od9J_mLbUC5M8p7GbMAt0",
    authDomain: "miniface-pro.firebaseapp.com",
    databaseURL: "https://miniface-pro-default-rtdb.asia-southeast1.firebasedatabase.app", // Dòng này cực kỳ quan trọng để trỏ đúng kho dữ liệu
    projectId: "miniface-pro",
    storageBucket: "miniface-pro.firebasestorage.app",
    messagingSenderId: "352343331606",
    appId: "1:352343331606:web:de3bc44f62afee38923637"
};

// Khởi động Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

export class SocialNetwork {
    constructor() {
        this.users = [];
        this.posts = [];
        this.notifications = [];
        this.messages = [];
        this.onDataChanged = null; // Biến này sẽ gọi main.js để vẽ lại màn hình khi có dữ liệu mới
    }

    // TÍNH NĂNG THỜI GIAN THỰC (REALTIME): Lắng nghe kho dữ liệu 24/7
    startListening() {
        onValue(ref(db, 'users'), (snapshot) => {
            this.users = snapshot.val() ? Object.values(snapshot.val()) : [];
            if (this.onDataChanged) this.onDataChanged();
        });

        onValue(ref(db, 'posts'), (snapshot) => {
            const data = snapshot.val();
            this.posts = data ? Object.values(data).map(p => ({
                ...p,
                likes: p.likes || [],
                comments: p.comments ? Object.values(p.comments) : []
            })) : [];
            if (this.onDataChanged) this.onDataChanged();
        });

        onValue(ref(db, 'notifications'), (snapshot) => {
            this.notifications = snapshot.val() ? Object.values(snapshot.val()) : [];
            if (this.onDataChanged) this.onDataChanged();
        });

        onValue(ref(db, 'messages'), (snapshot) => {
            this.messages = snapshot.val() ? Object.values(snapshot.val()) : [];
            if (this.onDataChanged) this.onDataChanged();
        });
    }

    addUser(name, password) {
        if (this.users.find(u => u.name.toLowerCase() === name.toLowerCase())) throw new Error("Tên đã tồn tại!");
        const newId = Date.now(); // Lên mạng phải dùng ID theo thời gian để không trùng nhau
        const newUser = {id: newId, name, password, avatar: 'https://i.pravatar.cc/150?u=' + newId};
        set(ref(db, 'users/' + newId), newUser); // Đẩy lên mây
        return newUser;
    }

    loginUser(name, password) {
        return this.users.find(u => u.name === name && u.password === password) || null;
    }

    updateAvatar(userId, newAvatarUrl) {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            user.avatar = newAvatarUrl;
            set(ref(db, 'users/' + userId), user);
            // Cập nhật lại các bài viết của user này
            this.posts.forEach(p => {
                if (p.user.id === userId) {
                    p.user.avatar = newAvatarUrl;
                    set(ref(db, 'posts/' + p.id), p);
                }
            });
        }
    }

    addPost(userId, content, imageUrl) {
        const user = this.users.find(u => u.id === userId);
        const newId = Date.now();
        const newPost = {
            id: newId,
            user,
            content,
            imageUrl,
            likes: [],
            comments: [],
            createdAt: new Date().toISOString()
        };
        set(ref(db, 'posts/' + newId), newPost); // Đẩy lên mây
    }

    deletePost(postId, userId) {
        const post = this.posts.find(p => p.id === postId);
        if (post && post.user.id === userId) {
            remove(ref(db, 'posts/' + postId)); // Xóa khỏi mây
        }
    }

    likePost(postId, actorId) {
        const post = this.posts.find(p => p.id === postId);
        const actor = this.users.find(u => u.id === actorId);
        if (post && actor) {
            let likes = post.likes || [];
            const index = likes.indexOf(actorId);
            let isLiked = false;

            if (index === -1) {
                likes.push(actorId);
                isLiked = true;
            } else {
                likes.splice(index, 1);
            }

            set(ref(db, 'posts/' + postId + '/likes'), likes); // Cập nhật lượt thích lên mây

            if (isLiked && post.user.id !== actorId) {
                this.addNotification(post.user.id, `${actor.name} đã thích bài viết của bạn.`, postId);
            }
        }
    }

    commentPost(postId, actorId, content) {
        const post = this.posts.find(p => p.id === postId);
        const actor = this.users.find(u => u.id === actorId);
        if (post && actor) {
            const commentId = Date.now();
            const newComment = {id: commentId, user: actor, content: content, createdAt: new Date().toISOString()};
            set(ref(db, `posts/${postId}/comments/${commentId}`), newComment);

            if (post.user.id !== actorId) {
                this.addNotification(post.user.id, `${actor.name} đã bình luận: "${content}"`, postId);
            }
        }
    }

    addNotification(receiverId, message, postId) {
        const notifId = Date.now();
        const notif = {id: notifId, receiverId, message, postId, isRead: false, createdAt: new Date().toISOString()};
        set(ref(db, 'notifications/' + notifId), notif);
    }

    markNotificationsAsRead(userId) {
        this.notifications.forEach(n => {
            if (n.receiverId === userId && !n.isRead) {
                set(ref(db, `notifications/${n.id}/isRead`), true);
            }
        });
    }

    sendMessage(senderId, receiverId, content) {
        const msgId = Date.now();
        const msg = {id: msgId, senderId, receiverId, content, createdAt: new Date().toISOString()};
        set(ref(db, 'messages/' + msgId), msg); // Gửi tin nhắn thẳng lên mây
    }

    getChatHistory(user1Id, user2Id) {
        return this.messages.filter(m => (m.senderId === user1Id && m.receiverId === user2Id) || (m.senderId === user2Id && m.receiverId === user1Id));
    }
}