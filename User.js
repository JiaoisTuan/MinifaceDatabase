export class User {
    constructor(id, name, password) {
        this.id = id;
        this.name = name;
        this.password = password;
        this.avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`;
    }
}