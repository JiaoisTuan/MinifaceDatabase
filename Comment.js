export class Comment {
    /**
     * @param {number} id - ID bình luận
     * @param {Object} user - Object người dùng bình luận
     * @param {string} content - Nội dung bình luận
     */
    constructor(id, user, content) {
        this.id = id;
        this.user = user;
        this.content = content;
        this.createdAt = new Date().toISOString(); // Lưu chuẩn ISO dễ format thời gian
    }
}