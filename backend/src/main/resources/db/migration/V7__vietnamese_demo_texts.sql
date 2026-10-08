-- V7: Việt hóa nội dung thông báo của dữ liệu demo (V5 giữ nguyên để không đổi checksum Flyway).
-- An toàn khi chạy trên cơ sở dữ liệu rỗng hoặc đã có dữ liệu thật: chỉ đổi các câu mẫu tiếng Anh do seed sinh ra.

UPDATE notifications SET title = 'Yêu cầu khẩn cấp gần bạn'      WHERE title = 'Emergency request near you';
UPDATE notifications SET title = 'Yêu cầu hiến máu gần bạn'      WHERE title = 'Blood request near you';
UPDATE notifications SET title = 'Yêu cầu đã được xác minh'      WHERE title = 'Request verified';
UPDATE notifications SET title = 'Chào mừng đến với LIFELY'      WHERE title = 'Welcome to LIFELY';

UPDATE notifications
   SET message = regexp_replace(message, '^(\S+) blood needed, ([0-9.]+) km away$', 'Cần máu \1, cách bạn \2 km')
 WHERE message ~ '^(\S+) blood needed, ([0-9.]+) km away$';

UPDATE notifications
   SET message = regexp_replace(message, '^Your (\S+) request is now being coordinated$', 'Yêu cầu \1 của bạn đang được điều phối')
 WHERE message ~ '^Your (\S+) request is now being coordinated$';

UPDATE notifications
   SET message = 'Hãy hoàn tất hồ sơ người hiến máu để chúng tôi kết nối bạn với các yêu cầu ở gần.'
 WHERE message = 'Complete your donor profile so we can match you with nearby requests.';

UPDATE donation_history SET location = 'Hiến máu qua LIFELY' WHERE location = 'LIFELY match';
