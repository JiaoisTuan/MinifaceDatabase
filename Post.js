import {Comment} from './Comment.js';

export class Post {
    constructor(id, user, content, imageUrl = "") {
        this.id = id;
        this.user = user;
        this.content = content;
        this.imageUrl = imageUrl;
        this.likes = []; // Nâng cấp: Mảng chứa ID những người đã like
        this.comments = [];
        this.createdAt = new Date().toISOString();
    }

    // Nâng cấp: Nếu đã like rồi thì bỏ like, chưa like thì thêm vào
    toggleLike(userId) {
        const index = this.likes.indexOf(userId);
        if (index === -1) {
            this.likes.push(userId);
            return true; // Trả về true nếu là hành động Like
        } else {
            this.likes.splice(index, 1);
            return false; // Trả về false nếu là hành động Unlike
        }
    }

    addComment(commentId, user, content) {
        const newComment = new Comment(commentId, user, content);
        this.comments.push(newComment);
        return newComment;
    }
}