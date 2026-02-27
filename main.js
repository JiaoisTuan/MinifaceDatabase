import { SocialNetwork } from './SocialNetwork.js';

const app = new SocialNetwork();
let currentUser = null;

// Hàm lấy DOM an toàn
const getEl = (id) => document.getElementById(id);

// DOM Elements
const authScreen = getEl('auth-screen');
const mainApp = getEl('main-app');
const authNameInput = getEl('auth-name');
const authPasswordInput = getEl('auth-password');
const btnLogin = getEl('btn-login');
const btnRegister = getEl('btn-register');
const authMessage = getEl('auth-message');
const btnLogout = getEl('btn-logout');

const uiAvatar = getEl('current-user-avatar');
const uiName = getEl('current-user-name');
const btnChangeAvatar = getEl('btn-change-avatar');
const postInput = getEl('post-content');
const postImageUrl = getEl('post-image-url');
const btnPost = getEl('btn-post');
const searchInput = getEl('search-input');
const newsFeed = getEl('news-feed');

const btnNotify = getEl('btn-notify');
const notifyDropdown = getEl('notify-dropdown');
const notifyBadge = getEl('notify-badge');
const notifyList = getEl('notify-list');

const menuMessages = getEl('menu-messages');
const chatPopup = getEl('chat-popup');
const btnCloseChat = getEl('btn-close-chat');
const btnChatBack = getEl('btn-chat-back');
const chatUserList = getEl('chat-user-list');
const chatRoom = getEl('chat-room');
const chatFooter = getEl('chat-footer');
const chatTitle = getEl('chat-title');
const chatInput = getEl('chat-input');
const btnSendChat = getEl('btn-send-chat');

let currentChatPartnerId = null;

// ==========================================
// THAY ĐỔI LỚN NHẤT NẰM Ở ĐÂY: Lắng nghe sự kiện Realtime
// ==========================================
app.onDataChanged = () => {
    // Mỗi khi Firebase báo có dữ liệu mới, hàm này tự động chạy!
    if (currentUser) {
        // Cập nhật lại avatar/tên lỡ có thay đổi
        const updatedUser = app.users.find(u => u.id === currentUser.id);
        if(updatedUser) {
            currentUser = updatedUser;
            uiAvatar.src = currentUser.avatar;
            uiName.textContent = currentUser.name;
        }

        // Vẽ lại toàn bộ Bảng tin, Thông báo và Chat
        renderPosts();
        renderNotifications();

        if(chatRoom.style.display === 'block') {
            renderMessages();
        }
        if(chatUserList.style.display === 'block') {
            openUserList();
        }
    }
};

// Bật "Camera giám sát" Firebase lên
app.startListening();

// Khởi tạo App ban đầu
function initApp() {
    authScreen.style.display = 'none';
    mainApp.style.display = 'flex';
    uiAvatar.src = currentUser.avatar;
    uiName.textContent = currentUser.name;
    renderPosts();
    renderNotifications();
}

// Kiểm tra xem đã lưu đăng nhập trước đó chưa
const savedUserId = localStorage.getItem('miniface_logged_in_user');
// Đợi 1 giây để Firebase kịp tải danh sách user về rồi mới check đăng nhập tự động
setTimeout(() => {
    if (savedUserId && app.users.length > 0) {
        const user = app.users.find(u => u.id === parseInt(savedUserId));
        if (user) { currentUser = user; initApp(); }
    }
}, 1000);

function showMessage(text, isSuccess) {
    authMessage.textContent = text;
    authMessage.style.color = isSuccess ? "#42b72a" : "#f02849";
}

// ---> GIỮ NGUYÊN TOÀN BỘ CODE TỪ SỰ KIỆN btnRegister.addEventListener TRỞ XUỐNG CŨ <---

btnRegister.addEventListener('click', () => {
    const name = authNameInput.value.trim();
    const pass = authPasswordInput.value.trim();
    if (!name || !pass) return showMessage("Vui lòng nhập đủ thông tin!", false);
    try {
        app.addUser(name, pass);
        showMessage("Đăng ký thành công!", true);
    } catch (err) {
        showMessage(err.message, false);
    }
});

btnLogin.addEventListener('click', () => {
    const name = authNameInput.value.trim();
    const pass = authPasswordInput.value.trim();
    const user = app.loginUser(name, pass);
    if (user) {
        currentUser = user;
        localStorage.setItem('miniface_logged_in_user', user.id);
        initApp();
    } else {
        showMessage("Sai thông tin đăng nhập!", false);
    }
});

btnLogout.addEventListener('click', () => {
    currentUser = null;
    localStorage.removeItem('miniface_logged_in_user');
    mainApp.style.display = 'none';
    authScreen.style.display = 'block';
});

btnChangeAvatar.addEventListener('click', () => {
    const newUrl = prompt("Dán link ảnh đại diện mới vào đây:");
    if (newUrl && newUrl.trim() !== "") {
        app.updateAvatar(currentUser.id, newUrl.trim());
        uiAvatar.src = newUrl.trim();
        renderPosts();
    }
});

// ==========================================
// 2. THÔNG BÁO
// ==========================================
function renderNotifications() {
    const myNotifs = app.notifications.filter(n => n.receiverId === currentUser.id).reverse();
    const unreadCount = myNotifs.filter(n => !n.isRead).length;

    if (unreadCount > 0) {
        notifyBadge.style.display = 'block';
        notifyBadge.textContent = unreadCount > 9 ? '9+' : unreadCount;
    } else {
        notifyBadge.style.display = 'none';
    }

    notifyList.innerHTML = myNotifs.length === 0
        ? '<li style="text-align:center; padding: 10px;">Không có thông báo</li>'
        : myNotifs.map(n => `<li style="padding: 10px; border-bottom: 1px solid #eee; background: ${n.isRead ? 'transparent' : '#e7f3ff'}">${n.message}</li>`).join('');
}

btnNotify.addEventListener('click', (e) => {
    e.preventDefault();
    const isHidden = notifyDropdown.style.display === 'none';
    notifyDropdown.style.display = isHidden ? 'block' : 'none';
    if (isHidden) {
        app.markNotificationsAsRead(currentUser.id);
        renderNotifications();
    }
});

// ==========================================
// 3. BÀI VIẾT (FEED)
// ==========================================
function formatTime(iso) {
    return new Date(iso).toLocaleString('vi-VN');
}

function renderPosts(dataToShow = app.posts) {
    newsFeed.innerHTML = '';
    [...dataToShow].reverse().forEach(post => {
        const deleteBtnHTML = (currentUser.id === post.user.id)
            ? `<button class="btn-delete-post" style="background:none; border:none; cursor:pointer; color:#f02849;"><i class="fa-solid fa-trash-can"></i></button>` : '';

        const imageHTML = post.imageUrl ? `<img src="${post.imageUrl}" class="post-image" onerror="this.style.display='none'">` : '';
        const isLikedByMe = Array.isArray(post.likes) && post.likes.includes(currentUser.id);
        const heartColor = isLikedByMe ? '#f02849' : '#65676b';
        const heartIcon = isLikedByMe ? 'fa-solid' : 'fa-regular';

        const commentsHTML = post.comments.map(c => `
            <li class="comment-item">
                <img src="${c.user.avatar}" alt="Avatar">
                <div class="comment-bubble">
                    <div class="comment-author">${c.user.name}</div>
                    <div class="comment-text">${c.content}</div>
                </div>
            </li>
        `).join('');

        const postHTML = `
            <article class="glass-effect post-item" data-id="${post.id}">
                <div class="post-header">
                    <div class="post-header-left">
                        <img src="${post.user.avatar}" alt="Avatar">
                        <div>
                            <div style="font-weight:bold;">${post.user.name}</div>
                            <div class="post-time">${formatTime(post.createdAt)}</div>
                        </div>
                    </div>
                    ${deleteBtnHTML}
                </div>
                <div class="post-content-text">${post.content}</div>
                ${imageHTML}
                <div class="post-stats">
                    <span><i class="fa-solid fa-heart" style="color:#f02849;"></i> ${Array.isArray(post.likes) ? post.likes.length : 0}</span>
                    <span>${post.comments.length} bình luận</span>
                </div>
                <div class="post-actions">
                    <button class="action-btn btn-like" style="color: ${heartColor}"><i class="${heartIcon} fa-heart"></i> Thích</button>
                    <button class="action-btn btn-focus-comment"><i class="fa-regular fa-comment"></i> Bình luận</button>
                </div>
                <div class="comment-input-wrapper" style="margin-top: 10px;">
                    <input type="text" class="input-comment" placeholder="Viết bình luận...">
                    <button class="btn-send-comment"><i class="fa-solid fa-paper-plane"></i></button>
                </div>
                <ul class="comment-list" style="margin-top: 15px;">${commentsHTML}</ul>
            </article>
        `;
        newsFeed.insertAdjacentHTML('beforeend', postHTML);
    });
}

btnPost.addEventListener('click', () => {
    const content = postInput.value.trim();
    const imageUrl = postImageUrl.value.trim();
    if (content || imageUrl) {
        app.addPost(currentUser.id, content, imageUrl);
        postInput.value = '';
        postImageUrl.value = '';
        renderPosts();
    }
});

searchInput.addEventListener('input', (e) => {
    const keyword = e.target.value.toLowerCase().trim();
    renderPosts(app.posts.filter(p => p.content.toLowerCase().includes(keyword) || p.user.name.toLowerCase().includes(keyword)));
});

newsFeed.addEventListener('click', (e) => {
    const postItem = e.target.closest('.post-item');
    if (!postItem) return;
    const postId = parseInt(postItem.getAttribute('data-id'));

    if (e.target.closest('.btn-like')) {
        app.likePost(postId, currentUser.id);
        renderPosts();
        renderNotifications();
    }
    if (e.target.closest('.btn-delete-post')) {
        if (confirm("Xóa bài viết này?")) {
            app.deletePost(postId, currentUser.id);
            renderPosts();
        }
    }
    if (e.target.closest('.btn-send-comment')) {
        const input = postItem.querySelector('.input-comment');
        if (input.value.trim()) {
            app.commentPost(postId, currentUser.id, input.value.trim());
            renderPosts();
            renderNotifications();
        }
    }
});

// ==========================================
// 4. TIN NHẮN (CHAT)
// ==========================================
menuMessages.addEventListener('click', (e) => {
    e.preventDefault();
    chatPopup.style.display = 'flex';
    openUserList();
});

btnCloseChat.addEventListener('click', () => {
    chatPopup.style.display = 'none';
});
btnChatBack.addEventListener('click', () => {
    openUserList();
});

function openUserList() {
    currentChatPartnerId = null;
    chatTitle.textContent = "Tin nhắn";
    btnChatBack.style.display = 'none';
    chatRoom.style.display = 'none';
    chatFooter.style.display = 'none';
    chatUserList.style.display = 'block';

    const otherUsers = app.users.filter(u => u.id !== currentUser.id);
    if (otherUsers.length === 0) {
        chatUserList.innerHTML = '<p style="text-align:center; margin-top: 20px;">Chưa có ai khác!</p>';
        return;
    }
    chatUserList.innerHTML = otherUsers.map(u => `
        <div class="chat-user-item" data-userid="${u.id}" style="display:flex; align-items:center; gap:10px; padding:10px; border-bottom:1px solid #eee; cursor:pointer;">
            <img src="${u.avatar}" style="width:40px; border-radius:50%;"><strong>${u.name}</strong>
        </div>
    `).join('');
}

chatUserList.addEventListener('click', (e) => {
    const userItem = e.target.closest('.chat-user-item');
    if (!userItem) return;
    const partner = app.users.find(u => u.id === parseInt(userItem.getAttribute('data-userid')));
    if (partner) {
        currentChatPartnerId = partner.id;
        openChatRoom(partner);
    }
});

function openChatRoom(partner) {
    chatTitle.textContent = partner.name;
    btnChatBack.style.display = 'block';
    chatUserList.style.display = 'none';
    chatRoom.style.display = 'block';
    chatFooter.style.display = 'flex';
    renderMessages();
}

function renderMessages() {
    if (!currentChatPartnerId) return;
    const history = app.getChatHistory(currentUser.id, currentChatPartnerId);
    chatRoom.innerHTML = history.length === 0
        ? '<p style="text-align:center; margin-top:20px;">Gửi lời chào đi nào!</p>'
        : history.map(msg => `
            <div style="clear:both; margin-bottom:10px;">
                <div class="msg-bubble ${msg.senderId === currentUser.id ? 'msg-sent' : 'msg-received'}">
                    ${msg.content}
                </div>
            </div>
          `).join('');
    chatRoom.scrollTop = chatRoom.scrollHeight;
}

btnSendChat.addEventListener('click', () => {
    if (chatInput.value.trim() && currentChatPartnerId) {
        app.sendMessage(currentUser.id, currentChatPartnerId, chatInput.value.trim());
        chatInput.value = '';
        renderMessages();
    }
});