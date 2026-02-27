import {SocialNetwork} from './SocialNetwork.js';

const app = new SocialNetwork();
let currentUser = null;

// Hàm lấy DOM cực kỳ an toàn (không làm sập web nếu thiếu ID)
const getEl = (id) => {
    const el = document.getElementById(id);
    if (!el) console.warn(`Cảnh báo: Không tìm thấy ID '${id}' trong file HTML!`);
    return el;
};

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

// Các biến cho phần Đăng bài
const postInput = getEl('post-content');
const postImageFile = getEl('post-image-file');
const imagePreviewContainer = getEl('image-preview-container');
const imagePreview = getEl('image-preview');
const btnRemoveImage = getEl('btn-remove-image');
let selectedFile = null;
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
// 1. Lắng nghe sự kiện Realtime & Khởi tạo
// ==========================================
app.onDataChanged = () => {
    if (currentUser) {
        const updatedUser = app.users.find(u => u.id === currentUser.id);
        if (updatedUser) {
            currentUser = updatedUser;
            if (uiAvatar) uiAvatar.src = currentUser.avatar;
            if (uiName) uiName.textContent = currentUser.name;
        }
        renderPosts();
        renderNotifications();
        if (chatRoom && chatRoom.style.display === 'block') renderMessages();
        if (chatUserList && chatUserList.style.display === 'block') openUserList();
    }
};

app.startListening();

function initApp() {
    if (authScreen) authScreen.style.display = 'none';
    if (mainApp) mainApp.style.display = 'flex';
    if (uiAvatar) uiAvatar.src = currentUser.avatar;
    if (uiName) uiName.textContent = currentUser.name;
    renderPosts();
    renderNotifications();
}

const savedUserId = localStorage.getItem('miniface_logged_in_user');
setTimeout(() => {
    if (savedUserId && app.users.length > 0) {
        const user = app.users.find(u => u.id === parseInt(savedUserId));
        if (user) {
            currentUser = user;
            initApp();
        }
    }
}, 1000);

function showMessage(text, isSuccess) {
    if (!authMessage) return;
    authMessage.textContent = text;
    authMessage.style.color = isSuccess ? "#42b72a" : "#f02849";
}

// ==========================================
// 2. TÀI KHOẢN (ĐĂNG NHẬP / ĐĂNG KÝ / ĐĂNG XUẤT)
// ==========================================
if (btnRegister) {
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
}

if (btnLogin) {
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
}

if (btnLogout) {
    btnLogout.addEventListener('click', () => {
        currentUser = null;
        localStorage.removeItem('miniface_logged_in_user');
        mainApp.style.display = 'none';
        authScreen.style.display = 'block';
    });
}

// ==========================================
// 3. CÔNG CỤ UP ẢNH LÊN IMGBB
// ==========================================
async function uploadToImgBB(file) {
    const apiKey = '9ffa5dbd7d2b183fb780fdceb6f0a7d1';
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData
    });
    const data = await res.json();
    if (data.success) return data.data.url;
    throw new Error("Không up được ảnh!");
}

if (btnChangeAvatar) {
    btnChangeAvatar.addEventListener('click', () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';

        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const originalText = btnChangeAvatar.innerHTML;
            btnChangeAvatar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>...';
            btnChangeAvatar.disabled = true;
            try {
                const newUrl = await uploadToImgBB(file);
                app.updateAvatar(currentUser.id, newUrl);
                if (uiAvatar) uiAvatar.src = newUrl;
                renderPosts();
            } catch (err) {
                alert("Lỗi: " + err.message);
            } finally {
                btnChangeAvatar.innerHTML = originalText;
                btnChangeAvatar.disabled = false;
            }
        };
        fileInput.click();
    });
}

// ==========================================
// 4. THÔNG BÁO
// ==========================================
function renderNotifications() {
    if (!notifyBadge || !notifyList) return;
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

if (btnNotify) {
    btnNotify.addEventListener('click', (e) => {
        e.preventDefault();
        const isHidden = notifyDropdown.style.display === 'none';
        notifyDropdown.style.display = isHidden ? 'block' : 'none';
        if (isHidden) {
            app.markNotificationsAsRead(currentUser.id);
            renderNotifications();
        }
    });
}

// ==========================================
// 5. BÀI VIẾT (FEED) & CHỌN ẢNH
// ==========================================
function formatTime(iso) {
    return new Date(iso).toLocaleString('vi-VN');
}

function renderPosts(dataToShow = app.posts) {
    if (!newsFeed) return;
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

if (postImageFile) {
    postImageFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            selectedFile = file;
            if (imagePreview) imagePreview.src = URL.createObjectURL(file);
            if (imagePreviewContainer) imagePreviewContainer.style.display = 'block';
        }
    });
}

if (btnRemoveImage) {
    btnRemoveImage.addEventListener('click', () => {
        selectedFile = null;
        postImageFile.value = '';
        if (imagePreviewContainer) imagePreviewContainer.style.display = 'none';
    });
}

if (btnPost) {
    btnPost.addEventListener('click', async () => {
        const content = postInput.value.trim();
        if (!content && !selectedFile) return;

        const originalText = btnPost.innerHTML;
        btnPost.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang đăng...';
        btnPost.disabled = true;

        try {
            let finalImageUrl = "";
            if (selectedFile) {
                finalImageUrl = await uploadToImgBB(selectedFile);
            }
            app.addPost(currentUser.id, content, finalImageUrl);

            postInput.value = '';
            selectedFile = null;
            if (postImageFile) postImageFile.value = '';
            if (imagePreviewContainer) imagePreviewContainer.style.display = 'none';
        } catch (error) {
            alert("Lỗi: " + error.message);
        } finally {
            btnPost.innerHTML = originalText;
            btnPost.disabled = false;
        }
    });
}

if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const keyword = e.target.value.toLowerCase().trim();
        renderPosts(app.posts.filter(p => p.content.toLowerCase().includes(keyword) || p.user.name.toLowerCase().includes(keyword)));
    });
}

if (newsFeed) {
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
}

// ==========================================
// 6. TIN NHẮN (CHAT)
// ==========================================
if (menuMessages) {
    menuMessages.addEventListener('click', (e) => {
        e.preventDefault();
        chatPopup.style.display = 'flex';
        openUserList();
    });
}

if (btnCloseChat) btnCloseChat.addEventListener('click', () => chatPopup.style.display = 'none');
if (btnChatBack) btnChatBack.addEventListener('click', () => openUserList());

function openUserList() {
    currentChatPartnerId = null;
    if (chatTitle) chatTitle.textContent = "Tin nhắn";
    if (btnChatBack) btnChatBack.style.display = 'none';
    if (chatRoom) chatRoom.style.display = 'none';
    if (chatFooter) chatFooter.style.display = 'none';
    if (chatUserList) chatUserList.style.display = 'block';

    const otherUsers = app.users.filter(u => u.id !== currentUser.id);
    if (otherUsers.length === 0) {
        if (chatUserList) chatUserList.innerHTML = '<p style="text-align:center; margin-top: 20px;">Chưa có ai khác!</p>';
        return;
    }
    if (chatUserList) chatUserList.innerHTML = otherUsers.map(u => `
        <div class="chat-user-item" data-userid="${u.id}" style="display:flex; align-items:center; gap:10px; padding:10px; border-bottom:1px solid #eee; cursor:pointer;">
            <img src="${u.avatar}" style="width:40px; border-radius:50%;"><strong>${u.name}</strong>
        </div>
    `).join('');
}

if (chatUserList) {
    chatUserList.addEventListener('click', (e) => {
        const userItem = e.target.closest('.chat-user-item');
        if (!userItem) return;
        const partner = app.users.find(u => u.id === parseInt(userItem.getAttribute('data-userid')));
        if (partner) {
            currentChatPartnerId = partner.id;
            openChatRoom(partner);
        }
    });
}

function openChatRoom(partner) {
    if (chatTitle) chatTitle.textContent = partner.name;
    if (btnChatBack) btnChatBack.style.display = 'block';
    if (chatUserList) chatUserList.style.display = 'none';
    if (chatRoom) chatRoom.style.display = 'block';
    if (chatFooter) chatFooter.style.display = 'flex';
    renderMessages();
}

function renderMessages() {
    if (!currentChatPartnerId || !chatRoom) return;
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

if (btnSendChat) {
    btnSendChat.addEventListener('click', () => {
        if (chatInput.value.trim() && currentChatPartnerId) {
            app.sendMessage(currentUser.id, currentChatPartnerId, chatInput.value.trim());
            chatInput.value = '';
            renderMessages();
        }
    });
}