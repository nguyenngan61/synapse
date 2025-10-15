# Ứng dụng Chat Real-time SYNAPSE

![CLEVERNOW GmbH Logo](images/logo-light.png)

**Live Demo:** [https://synapse-k0fm.onrender.com/](https://synapse-k0fm.onrender.com/)

## 1. Giới thiệu

SYNAPSE là một ứng dụng chat real-time được xây dựng như một bài kiểm tra kỹ thuật cho vị trí Intern Web Developer tại **CLEVERNOW GmbH**. Tên gọi "Synapse" (khớp thần kinh) được lựa chọn để phản ánh mục tiêu cốt lõi của ứng dụng: tạo ra một không gian nơi thông tin và ý tưởng được kết nối, truyền đi một cách liền mạch và tức thì giữa các thành viên.

Dự án được phát triển từ đầu, sử dụng ngăn xếp công nghệ MERN-like (MongoDB, Express, Node.js) và được triển khai trên nền tảng đám mây.

## 2. Các Công nghệ sử dụng

* **Backend:** Node.js, Express.js
* **Real-time:** Socket.IO
* **Database:** MongoDB (với Mongoose), được host trên MongoDB Atlas
* **Frontend:** HTML5, CSS3, JavaScript (ES6+)
* **Lưu trữ Ảnh:** Cloudinary
* **Triển khai (Deployment):** Render
* **Quản lý phiên bản:** Git & GitHub

## 3. Các Tính năng đã Hoàn thiện

Dự án đã hoàn thành tất cả các yêu cầu cốt lõi và phát triển thêm nhiều tính năng nâng cao để mang lại trải nghiệm hoàn chỉnh.

### Giao tiếp & Tương tác
-   [x] **Gửi/Nhận tin nhắn Real-time:** Gửi và nhận tin nhắn văn bản, emoji, và hình ảnh ngay lập tức.
-   [x] **Hệ thống Kênh chat (Channels):** Cho phép thảo luận theo nhiều chủ đề khác nhau.
-   [x] **Tin nhắn Riêng tư:** Hỗ trợ chat 1-1 giữa những người dùng.
-   [x] **Trả lời, Sửa, Xóa tin nhắn:** Cung cấp các công cụ quản lý tin nhắn đầy đủ.
-   [x] **Chỉ báo "Đang gõ...":** Cung cấp phản hồi tức thì về hoạt động của người dùng khác.
-   [x] **Thông báo Tin nhắn mới:** Thông báo trên tiêu đề trang và âm thanh khi có tin nhắn mới ở tab không hoạt động.

### Giao diện & Trải nghiệm Người dùng (UI/UX)
-   [x] **Thiết kế Đáp ứng (Responsive):** Giao diện hoạt động tốt trên cả máy tính và điện thoại.
-   [x] **Chế độ Sáng/Tối (Light/Dark Mode):** Cho phép chuyển đổi giao diện và lưu lại lựa chọn.
-   [x] **Quản lý Người dùng:** Hiển thị danh sách người dùng với trạng thái Online/Offline và thời gian offline.
-   [x] **Tối ưu hóa Hiển thị:** Tự động gom nhóm các tin nhắn gửi liên tiếp và hiển thị thời gian gửi.
-   [x] **Tìm kiếm Lịch sử:** Cho phép tìm kiếm tin nhắn văn bản trong kênh hiện tại.

## 4. Hướng dẫn Cài đặt & Chạy dự án tại Local

Để chạy dự án trên máy tính của bạn, hãy làm theo các bước sau:

1.  **Clone repository này về máy:**
    ```bash
    git clone [https://github.com/nguyenngan61/synapse.git](https://github.com/nguyenngan61/synapse.git)
    ```

2.  **Di chuyển vào thư mục dự án:**
    ```bash
    cd synapse
    ```

3.  **Cài đặt các thư viện cần thiết:**
    ```bash
    npm install
    ```

4.  **Tạo file `.env`:**
    * Tạo một file tên là `.env` ở thư mục gốc.
    * Thêm vào đó các biến môi trường cần thiết với thông tin của bạn:
        ```dotenv
        MONGO_URI=<Chuỗi kết nối MongoDB Atlas của bạn>
        CLOUDINARY_CLOUD_NAME=<Tên cloud của Cloudinary>
        CLOUDINARY_API_KEY=<API Key của Cloudinary>
        CLOUDINARY_API_SECRET=<API Secret của Cloudinary>
        ```

5.  **Tạo thư mục `uploads`:**
    * Tạo một thư mục trống tên là `uploads` ở thư mục gốc.

6.  **Chạy server:**
    ```bash
    node server.js
    ```
    Ứng dụng sẽ chạy tại `http://localhost:3000`.

## 5. Hướng phát triển Tương lai

Nếu có thêm thời gian, dự án sẽ được cải thiện với các tính năng sau:

* **01. Hệ thống Đăng nhập/Đăng ký hoàn chỉnh:** Sử dụng JWT (JSON Web Tokens) để xác thực và bảo mật.
* **02. Thông báo Đẩy (Push Notifications):** Gửi thông báo đến thiết bị người dùng ngay cả khi họ đã đóng trình duyệt.
* **03. Hồ sơ cá nhân & Avatar:** Thay vì chỉ có tên, mỗi người dùng sẽ có một trang hồ sơ nhỏ và có thể tải lên ảnh đại diện (avatar).
* **04. Ghim tin nhắn (Pin Messages):** Cho phép người dùng ghim những tin nhắn quan trọng lên đầu kênh chat.
* **05. Bày tỏ cảm xúc tin nhắn (Message Reactions):** Cho phép người dùng nhấn và giữ vào một tin nhắn để thả các biểu tượng cảm xúc.
* **06. Tin nhắn thoại (Voice Messages):** Thêm một nút micro để người dùng có thể ghi âm và gửi một đoạn tin nhắn thoại.
* **07. Trạng thái tin nhắn (Seen/Delivered Status):** Hiển thị icon cho biết tin nhắn đã được gửi, đã nhận và đã được xem.
* **08. Tạo cuộc thăm dò ý kiến (Polls):** Cho phép người dùng tạo một cuộc bình chọn nhanh trong kênh chat.
* **09. Nhắc tên thành viên (@Mentions):** Khi người dùng gõ `@`, một danh sách thành viên sẽ hiện ra để có thể "tag" tên một người cụ thể.