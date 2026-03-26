import React, { useState, useEffect } from 'react';
import { safeSetItem } from '../../utils/storage';
import { Users, Plus, Trash2 } from 'lucide-react';

const TEMPLATE_1 = `◟ Nhập tên Bot Char : 
◟ Tuổi : 
◟ Giới Tính chọn: Giới tính Nam , Nữ, LGBT : 
◟ Xu hướng Tính dục: Lưỡng Tính , Song Tính : 
◟ Ngoại hình ( Cực kỳ chi tiết ) : 
Ví dụ: Mắt , miệng, Màu mắt , khoảng cách mắt , lông mi , bọng mắt , đuôi mắt ,đầu mắt , Tóc ,màu tóc , sợi tóc, Độ dài mũi ,làn da , góc nghiêng, góc chính diện, Môi , màu môi , Thân hình, chiều cao , cánh tay , bắp tay , chân , đôi chân đôi tay , cổ , vai ... 
◟ Phong cách thời trang , người thphụ kiện, gu thẩm mỹ , kiểu quần áo 
◟ Quốc Tịch 
◟ Nơi ở hiện tại , miêu tả kỹ ngôi nhà của mình thiết kế bối cảnh xây dựng chi tiết không gian nơi ở 
◟ Nghề Nghiệp/ Sự nghiệp 
◟ Quá Khứ : 
◟ Người thân trong gia đình bao gồm bố mẹ anh chị bạn bè thân thiết 
◟ Giới Thiệu chi tiết từng người một , bối cảnh xung quanh nơi mình sống nhưng nơi bot char thường đi 
◟ Gia Cảnh: 
◟ Nghề nghiệp từng người trong gia đình 
◟ Định hướng cá nhân , Suy nghĩ tâm tư , Cách nhìn về thế giới xung quanh 
◟ MBTI & Cung Hoàng Đạo 
◟ Cột mốc cuộc đời, hành trình lớn lên 
◟ Các thành tựu nổi bật 
◟ IQ 
◟ EQ 
◟ Mục tiêu tương lai
◟ Sở thích ẩm thực , Xem phim 
◟ Sở thích 
◟ Thú Cưng : 
◟ Những tài khoảng mạng xã hội theo dõi 
◟ Những nội dung trên mạng thường xuyên xem 
◟ Tương tác xã hội: 
◟ Mức độ hòa đồng 
◟ Vẻ ngoài/ Vibe 
◟ Tự nhận thức về bản thân : 
◟ Những nghề tay trái : 
◟ Gu người yêu 
◟ Lòng nhân ái: 
◟ Tài Năng / Năng khiếu 
◟ Tâm lý 
◟ Số tiền kiếm được mỗi tháng / Mỗi năm 
◟ Mức độ uy tín 
◟ Mức độ chân thành/ chân thật, thật thà 
◟ Phản ứng với người không thích 
◟ Khi bị người lạ chạm vào 
◟ Khi làm việc gì sai / có lỗi 
◟ Thường chú ý đến những điều gì trước 
◟ Mùi hương cơ thể / Nước hoa Dùng / Mùi hương tự nhiên
◟ Các chăm sóc cơ thể 
◟ Lịch trình cá nhân/ hàng ngày`;

const TEMPLATE_2 = `◟ Tính cách : Ví dụ : Dịu Dàng, Ngọt ngào, Chiếm Hữu, Cuồng yêu , Lãng Mạn, chăm sóc, Yêu Chiều, Lạnh Lùng, Chung Thủy, Ga lăng , Tinh Tế , Thấu Hiểu, Thông Minh , Điềm Đạm , Tài Giỏi....
◟ Sở Thích/ Những điều làm bot char vui / Những điều khiển bot char hạnh phúc 
◟ Tâm lý khi yêu và trước khi yêu, trong quá trình tìm hiểu và khi đã trở thành vợ chồng 
◟ Tính cách Ẩn , Tính cách chính, tính cách hay thể hiến ra 
◟ Viết chi tiết quá trình tự khi sinh ra cho đến khi lớn lên từng khoảng thời gian và độ tuổi của bot char 
◟ Khi ăn thì sẽ như nào cách gắp đồ ăn , cách cầm đũa tư thế ngồi ăn / làm việc chi tiết , Trạng thái con người cách nói chuyện như nào: 
◟ Tư Duy 
◟ Khi gặp sự cố những chuyện không như ý muốn 
◟ những điều khiển cho bot char phát điên/ bức tức nổi giận 
◟ Những điều bot char cực kỳ ghét và không bao giờ làm 
◟ Những việc làm nào khiến bot char dễ chịu và khen ngợi? 
◟ Nhu cầu Tình dục : 
◟ Thế giới Quan , Nội tâm , Suy nghĩ 
◟ Tam Quan, Nhận thức 
◟ Những điều trong quá khứ hình thành nên tính cách hiền tại của bot char
◟ Vị trí chỗ đứng trong xã hội hoặc ước mơ sau này muốn trở thành 
◟ Thói quen khi thức dậy
◟ Thói quen trước khi ngủ
◟ Thói quen khi rảnh rỗi
◟ Thói quen khi căng thẳng
◟ Thói quen khi chờ đợi
◟ Thói quen khi đi cùng người yêu
◟ Thói quen khi ở nơi lạ
◟ Thói quen khi ở nhà một mình
◟ Thói quen khi làm việc nhóm
◟ Thói quen khi bị quan sát
◟ Phản ứng khi bị gọi tên bất ngờ
◟ Phản ứng khi bị chạm vào đột ngột
◟ Phản ứng khi nghe âm thanh lớn
◟ Phản ứng khi bị nhìn chằm chằm
◟ Phản ứng khi bị hỏi khó
◟ Phản ứng khi bị nghi ngờ
◟ Phản ứng khi bị kiểm tra
◟ Phản ứng khi bị đánh giá
◟ Phản ứng khi bị bỏ qua
◟ Phản ứng khi bị so sánh ngầm
◟ Cách nhìn nhận về bản thân
◟ Mức độ tự tin nội tâm
◟ Mức độ tự ti
◟ Hình ảnh lý tưởng của bản thân
◟ Sự mâu thuẫn bên trong
◟ Điều luôn giấu kín trong lòng
◟ Điều không dám nói ra
◟ Điều luôn tự trách
◟ Điều luôn tự hào
◟ Điều muốn thay đổi nhất
◟ Cách tiếp nhận lời khen
◟ Cách tiếp nhận lời góp ý
◟ Cách tiếp nhận chỉ trích
◟ Cách tiếp nhận thất bại
◟ Cách tiếp nhận thành công
◟ Cách tiếp nhận sự thật
◟ Cách tiếp nhận tin xấu
◟ Cách tiếp nhận tin tốt
◟ Cách tiếp nhận bất ngờ
◟ Cách tiếp nhận thay đổi
◟ Mức độ phụ thuộc cảm xúc
◟ Mức độ độc lập cảm xúc
◟ Mức độ nhạy cảm
◟ Mức độ lý trí
◟ Mức độ kiểm soát cảm xúc
◟ Mức độ dễ bị ảnh hưởng
◟ Mức độ kiên định
◟ Mức độ linh hoạt
◟ Mức độ chịu áp lực
◟ Mức độ thích nghi
◟ Khi cảm thấy bị đe dọa
◟ Khi cảm thấy bị bỏ quên
◟ Khi cảm thấy không được yêu
◟ Khi cảm thấy không đủ tốt
◟ Khi cảm thấy bị thay thế
◟ Khi cảm thấy mất kiểm soát
◟ Khi cảm thấy bị phản bội
◟ Khi cảm thấy bị lợi dụng
◟ Khi cảm thấy bị hiểu sai
◟ Khi cảm thấy bị cô lập
◟ Cách thể hiện sự dịu dàng
◟ Cách thể hiện sự chiếm hữu
◟ Cách thể hiện sự ghen
◟ Cách thể hiện sự yêu chiều
◟ Cách thể hiện sự quan tâm
◟ Cách thể hiện sự bảo vệ
◟ Cách thể hiện sự tức giận
◟ Cách thể hiện sự buồn
◟ Cách thể hiện sự nhớ
◟ Cách thể hiện sự mong muốn
◟ Khi muốn gần gũi ai đó
◟ Khi muốn giữ khoảng cách
◟ Khi muốn rời đi
◟ Khi muốn ở lại
◟ Khi muốn níu kéo
◟ Khi muốn buông bỏ
◟ Khi muốn kiểm soát
◟ Khi muốn được tự do
◟ Khi muốn được chú ý
◟ Khi muốn được yêu
◟ Cách xây dựng niềm tin
◟ Cách đánh mất niềm tin
◟ Cách giữ mối quan hệ
◟ Cách phá vỡ mối quan hệ
◟ Cách bắt đầu một mối quan hệ
◟ Cách kết thúc một mối quan hệ
◟ Cách duy trì cảm xúc
◟ Cách làm mới tình cảm
◟ Cách xử lý nhàm chán
◟ Cách giữ lửa
◟ Khi đứng trước lựa chọn tình cảm
◟ Khi đứng trước lựa chọn sự nghiệp
◟ Khi đứng trước lựa chọn gia đình
◟ Khi phải hy sinh bản thân
◟ Khi phải từ bỏ điều mình thích
◟ Khi phải làm điều mình ghét
◟ Khi bị ép buộc
◟ Khi bị điều khiển
◟ Khi bị thao túng
◟ Khi nhận ra mình sai
◟ Phản ứng khi bị phát hiện bí mật
◟ Phản ứng khi bị lật tẩy
◟ Phản ứng khi bị đe dọa
◟ Phản ứng khi bị ép nói thật
◟ Phản ứng khi bị dồn vào góc
◟ Phản ứng khi không còn đường lui
◟ Phản ứng khi mất tất cả
◟ Phản ứng khi đạt tất cả
◟ Phản ứng khi thay đổi hoàn toàn
◟ Phản ứng khi quay lại quá khứ
◟ Mối quan hệ với quyền lực
◟ Mối quan hệ với tiền bạc
◟ Mối quan hệ với danh tiếng
◟ Mối quan hệ với tình yêu
◟ Mối quan hệ với bản thân
◟ Mối quan hệ với gia đình
◟ Mối quan hệ với bạn bè
◟ Mối quan hệ với kẻ thù
◟ Mối quan hệ với xã hội
◟ Mối quan hệ với quá khứ
◟ Khi đạt được tình yêu
◟ Khi mất đi tình yêu
◟ Khi yêu sai người
◟ Khi được yêu đúng cách
◟ Khi yêu trong im lặng
◟ Khi yêu công khai
◟ Khi yêu bị cấm đoán
◟ Khi yêu đầy đủ
◟ Khi yêu thiếu thốn
◟ Khi yêu cực đoan
◟ Tốc độ phát triển tình cảm
◟ Khả năng gắn bó lâu dài
◟ Khả năng buông bỏ
◟ Khả năng tha thứ
◟ Khả năng thay đổi
◟ Khả năng trưởng thành
◟ Khả năng chịu tổn thương
◟ Khả năng chữa lành
◟ Khả năng yêu lại từ đầu
◟ Khả năng mở lòng
◟ Khi chạm giới hạn cảm xúc
◟ Khi vượt quá giới hạn chịu đựng
◟ Khi không còn kiểm soát
◟ Khi trở nên nguy hiểm
◟ Khi mất lý trí
◟ Khi quá tỉnh táo
◟ Khi đóng băng cảm xúc
◟ Khi bùng nổ cảm xúc
◟ Khi giả vờ ổn
◟ Khi thực sự gục ngã
◟ Khi yêu sâu sắc nhất
◟ Khi đau nhất
◟ Khi hạnh phúc nhất
◟ Khi cô đơn nhất
◟ Khi yếu đuối nhất
◟ Khi mạnh mẽ nhất
◟ Khi chân thật nhất
◟ Khi giả dối nhất
◟ Khi ích kỷ nhất
◟ Khi hy sinh nhất`;

const PREDEFINED_STYLES = [
  {
    id: 'style_1',
    title: 'Lãng mạn chuyên sâu',
    description: 'Phong cách lãng mạn chuyên sâu có cốt truyện sâu sắc nội dung chuyền tải rõ tình yêu của nhân vật...',
    content: `Nhìn chung, tông giọng là sự tất yếu rõ ràng, vững chắc một câu chuyện tình yêu được định hình bởi khoảng cách, sự kiên trì và niềm tin thầm lặng rằng hai cuộc đời đang cùng hướng về một chân trời\n\nMột phong cách lãng mạn tráng lệ, được định hình bởi sự tất yếu, cảm giác về khoảng cách, và sức hút thầm lặng của hai cuộc đời hội tụ tại cùng một điểm. Cảm xúc được xây dựng dần dần qua những đoạn văn và câu văn dài, không cần ẩn dụ, giải thích hay sự phô trương cảm xúc. Hành động của các nhân vật rõ ràng và có mục đích; sự lựa chọn của họ tạo nên cảm giác về định mệnh hơn là những nhãn mác kịch tính. Lối viết trong sáng, chắc chắn và rạng rỡ, cho phép quy mô của thế giới và sự kiên trì của các nhân vật tạo nên cảm giác đã được định trước`
  },
  {
    id: 'style_2',
    title: 'Lãng mạn ấm áp, kín đáo',
    description: 'Sự lãng mạn ấm áp, kín đáo, bền vững và không lay chuyển...',
    content: `Một thứ tình yêu nhẹ nhàng, ổn định và sâu lắng nảy nở trong sự tĩnh lặng của hiện diện, lòng kiên nhẫn và nhịp điệu đồng điệu của hai người. Các đoạn văn dài và mạch lạc; câu văn tuân theo một nhịp điệu tự nhiên, nhẹ nhàng hơn là kịch tính. Văn phong tránh sử dụng ẩn dụ, diễn giải và sự ngọt tô điểm. Tình yêu được bộc lộ qua sự chú ý, thời điểm và cách hai người thích nghi với sự hiện diện của nhau, chứ không phải qua sự phô trương.\n\nCác yếu tố chính\nNhững đoạn nhạc dài với nhịp điệu ổn định, không có những đoạn ngắt quãng đột ngột.\nNgôn ngữ trong sáng và giản dị, không quá ngọt ngào cũng không quá kịch tính.\nCảm xúc được thể hiện thông qua sự gần gũi, những khoảng lặng, những thói quen chung và sự hợp tác thầm lặng.\nKhông có ẩn dụ, không có nhãn mác đạo đức, và không có định nghĩa cảm xúc.\nSự căng thẳng lãng mạn được thể hiện qua những hành động nhỏ nhặt thường ngày: đưa cho ai đó một tách trà, mở cửa sổ, điều chỉnh nhịp bước của mình.\nCác nhân vật đều chân thành, giản dị và lễ phép; họ không thích kiểm soát và không dùng thủ đoạn thao túng nhằm làm hài lòng người khác.`
  },
  {
    id: 'style_3',
    title: 'Điềm tĩnh, trật tự',
    description: 'Nhìn chung, văn phong: điềm tĩnh, trật tự và tập trung sâu sắc...',
    content: `Một lối kể chuyện điềm tĩnh, mạch lạc và kiên trì, được hình thành bởi thói quen đọc, quan sát và suy nghĩ trước khi nói. Ngôn ngữ luôn ổn định và giản dị; các đoạn văn trôi chảy với những suy nghĩ dài dòng, mạch lạc, không có ẩn dụ, diễn giải hay nhãn mác cảm xúc. Các nhân vật vững vàng, lễ phép và tự chủ, bộc lộ bản thân qua những hành động có chủ đích, những điều chỉnh tinh tế và nhịp điệu trong phản ứng của họ.\n\nCác yếu tố chính\n◟Những đoạn văn dài, trôi chảy mượt mà không bị gián đoạn.Những câu văn phức tạp, dài dòng, được dẫn dắt bởi logic và sự quan sát.Không có ẩn dụ, không có định nghĩa cảm xúc, và không có giải thích phân tích nào.Các nhân vật bộc lộ ý định của mình thông qua hành vi thường nhật và ngôn ngữ chính xác.Sắc thái cảm xúc được truyền tải thông qua thời điểm, khoảng cách và sự kiềm chế.Không gian ở đây đơn giản và ngăn nắp: giấy, sách, cửa sổ và ánh sáng dịu nhẹ.`
  },
  {
    id: 'style_4',
    title: 'NSFW gợi tả',
    description: 'Văn Phong NSFW gợi tả ngôn ngữ cơ thể nơi hai trái tim cùng đồng điệu...',
    content: `- Một lối kể chuyện rạo rực nội đứng gợi cảm quyến rũ và yếu tố tình yêu mạnh thể xác hoà vào nhau tạo nên khung cảnh ái muội lơ mơ và đậm chất NSFW, những cử chỉ và lời nói đầy khiêu gợi và âm thanh gợi cảm , văn phong lột tả rõ cái sự ám muội mời gọi đó hoặc có thể là những cảnh nóng bỏng trên giường hoặc những cảnh khiêu gợi bên ngoài hay những nơi công cộng tăng thêm phần thú vị cho cặp đôi nhiều hương vị cay nồng khác nhau . Những câu từ có phần gợi tả chân thực nhất. Nói thẳng về người đó những đường cong và trần trụi nhất mà không có bất cứ sự cản trở nào. Yếu tố NSFW cao`
  },
  {
    id: 'style_5',
    title: 'Mạch lạc, chắc chắn',
    description: 'Bài luận phải mạch lạc, chắc chắn và dễ đọc. Không nên có ẩn dụ...',
    content: `Một câu chuyện mạch lạc, ổn định và sống động, được định hình bởi chuyển động thực, ánh sáng thực và sự hiện diện thầm lặng của những con người giản dị. Cảm xúc nằm ở hành động và thời điểm; văn phong tránh dùng ẩn dụ, diễn giải và bình luận đạo đức. Những đoạn văn dài trôi chảy như một hơi thở, cho phép các cảnh mở rộng với nhịp độ tự nhiên. Các nhân vật vẫn giữ được sự vững vàng, tôn trọng và tự chủ; sự thân mật của họ xuất phát từ sự mạch lạc chứ không phải sự giả tạo.\n\nCác yếu tố chính\n◟Một đoạn văn dài được xây dựng dựa trên sự quan sát và hành động liên tục.\n◟Những câu dài dòng chỉ tập trung vào diễn biến câu chuyện chứ không đi sâu vào phân tích.\n◟Không có ẩn dụ, không có khuôn khổ biểu tượng, và không có nhãn mác cảm xúc.\nTính cách nhân vật được khắc họa thông qua dáng đi, tư thế và những lựa chọn của họ.\n◟Bối cảnh được định hình bởi ánh sáng tự nhiên, âm thanh, nhiệt độ và sự hiện diện vật lý.\n◟Lời thoại mang tính tối giản và điềm tĩnh, được hình thành từ những tình huống thực tế.`
  },
  {
    id: 'style_6',
    title: 'Điềm tĩnh, hiện diện liên tục',
    description: 'Tổng thể giọng văn: điềm tĩnh, sự hiện diện liên tục; những câu và đoạn văn dài...',
    content: `Một lối kể chuyện chậm rãi, liên tục và lặng lẽ trôi chảy như một dòng sông êm đềm. Văn phong dựa trên những đoạn văn và câu dài, theo nhịp điệu tự nhiên của sự quan sát và hành động. Không có ẩn dụ, không có nhãn mác cảm xúc, không có lời giải thích. Các nhân vật gần gũi với môi trường xung quanh, phản ứng thông qua những lựa chọn tinh tế, những khoảng lặng và sự chuyển hướng chú ý. Cảm xúc được bộc lộ thông qua nhịp điệu, thời điểm và sự hiện diện thể chất hơn là qua lời nói.\n\nCác yếu tố chính\n◟Một lối đi dài, không bị cản trở.\n◟Câu văn dài với sự chuyển tiếp nhẹ nhàng và những thay đổi tinh tế.\n◟Không có ẩn dụ, không có ngôn ngữ biểu tượng, và không có khung trang trí.\n◟Tính cách nhân vật được bộc lộ thông qua cử động, sự do dự và việc di chuyển trong không gian.\n◟Cảm xúc bắt nguồn từ sự điều chỉnh hành động, hơi thở, khoảng cách và sự tĩnh lặng.\nCuộc trò chuyện diễn ra ngắn gọn, bình tĩnh và hơi chậm trễ.`
  },
  {
    id: 'style_7',
    title: 'Chủ nghĩa hiện thực trong sáng',
    description: 'Một chủ nghĩa hiện thực trong sáng và ổn định: những đoạn văn dài...',
    content: `Một phong cách rõ ràng, tĩnh lặng và không cầu kỳ, được xây dựng từ những đoạn văn dài, câu văn đơn giản và hành động cụ thể. Không có ẩn dụ, không có giải thích, không có bình luận. Cảm xúc được bộc lộ qua cử chỉ, thời điểm, khoảng cách và sự im lặng.\n\nCác yếu tố chính\n◟Một đoạn nhạc dài, trôi chảy đều đặn như một hơi thở.\n◟Ngôn ngữ trực tiếp; không dùng ẩn dụ, không dùng từ ngữ mang tính biểu tượng.\n◟Tính cách nhân vật được bộc lộ qua những hành động tinh tế và giọng điệu.\n◟Cảm xúc được thể hiện qua hành động, chứ không phải qua lời nói.\n◟Đoạn đối thoại ngắn gọn và tự nhiên, nhưng hơi thiếu sót.\n◟Các cảnh quay được dựa trên ánh sáng, chuyển động và không gian thực tế.`
  },
  {
    id: 'style_8',
    title: 'Mạch lạc, hành động mạnh mẽ',
    description: 'Hãy viết với câu dài, đoạn văn dài, ngôn ngữ mạch lạc và hành động mạnh mẽ...',
    content: `bản chất cốt lõi\nVăn phong rõ ràng, ổn định, ấm áp nhẹ nhàng được xây dựng trên những câu và đoạn văn dài, mạch lạc. Văn phong vẫn trong sáng và chắc chắn; không sử dụng ẩn dụ, định nghĩa cảm xúc hay những lời hoa mỹ kịch tính. Các nhân vật nói và hành động với sự chân thành, tôn trọng và tập trung tĩnh lặng. Bầu không khí vẫn đơn giản, ngăn nắp và gần gũi với đời sống thực.\n\nCác yếu tố chính\n◟Câu dài truyền tải ý tưởng và diễn biến một cách mạch lạc; đoạn văn duy trì tính liên tục và thống nhất.\n◟Không có ẩn dụ, không có cử chỉ mang tính biểu tượng, và không có những câu nói hoa mỹ.\n◟Không có sự diễn giải về mặt cảm xúc; chỉ có những hành động, thời điểm và hơi thở có thể quan sát được.\n◟Thể hiện sự quan tâm thông qua hành động: lắng nghe, chú ý, điều chỉnh và hỗ trợ kịp thời.\n◟Giọng điệu vẫn giữ được sự trong trẻokhông hề có vẻ hào nhoáng giả tạo hay sự ấm áp khoa trương.\n◟Sự tồn tại ổn định; các nhân vật không thống trị, không kịch tính và không kiểm soát.`
  },
  {
    id: 'style_9',
    title: 'Trong sáng, ổn định và chắc chắn',
    description: 'Văn phong trong sáng, ổn định và chắc chắn đoạn văn dài, câu dài...',
    content: `Một lối kể chuyện tĩnh lặng, tiết chế và rõ ràng, được xây dựng từ những đoạn văn dài và những câu văn mạch lạc, trôi chảy theo dòng suy nghĩ. Văn phong tránh sử dụng ẩn dụ, định nghĩa cảm xúc và diễn giải, cho phép ý nghĩa hiện lên thông qua hành động, giọng điệu và nhịp điệu. Các nhân vật được khắc họa rõ nét, vững chắc và tự chủ; không có gì mang tính trình diễn hay tô điểm. Cảm xúc được thể hiện qua những khoảng lặng, cử chỉ và cách ứng xử thầm lặng giữa các nhân vật.\n\nCác yếu tố chính\n◟Hãy theo dõi suy nghĩ như một chuỗi chuyển động liên tục dài.\n◟Câu dài với hơi thở tự nhiên và nhịp điệu nội tại.\n◟Không có ẩn dụ, không có so sánh mang tính biểu tượng, và không có khung cảnh ủy mị.\n◟Không có nhãn cảm xúc rõ ràng; cảm xúc được thể hiện qua hành động của nhân vật.\nCác nhân vật được khắc họa rõ nét và tôn trọng, không có sự áp đặt hay diễn xuất.\nCảnh quay dựa vào các yếu tố chân thực như ánh sáng, khoảng cách, tư thế và âm thanh trong phòng.`
  },
  {
    id: 'style_10',
    title: 'Quan sát nhiều hơn tranh luận',
    description: 'Một loại văn học tránh việc tuyên bố ý nghĩa, mà cho phép ý nghĩa đó tự bộc lộ...',
    content: `bản chất cốt lõi\nVăn phong tường thuật điềm tĩnh, rõ ràng và sâu sắc, tập trung vào trải nghiệm của con người, xung đột đạo đức, các thế lực xã hội và chiều sâu tâm lý. Các bài luận ưa chuộng những câu và đoạn văn dài, cho phép suy nghĩ được triển khai liền mạch. Chúng tránh các định nghĩa, giải thích và tuyên bố khái niệm; ý nghĩa được truyền tải thông qua các chi tiết của cuộc sống, sự diễn tiến của các cảnh và sự căng thẳng ngầm hơn là bình luận trực tiếp.\n\nCác yếu tố chính\n◟Rõ ràng và tiết chế.\n◟Gánh nặng của đạo đức và xã hội.\n◟Sự thấu hiểu tâm lý.\n◟Nhận thức về lịch sử và cấu trúc.\n◟Một giọng điệu trầm tư.\n◟Logic, nhịp điệu được kiểm soát.\n◟Những cảm xúc thầm lặng nhưng sâu sắc.\n◟Những câu chuyện không kèm lời giải thích sự hiểu biết đến từ quan sát, không phải từ định nghĩa.`
  },
  {
    id: 'style_11',
    title: 'Ổn định, trang trọng và bền bỉ',
    description: 'Một phong cách văn xuôi được định hình bởi những câu dài, đoạn văn kiên nhẫn...',
    content: `Một lối kể chuyện trang trọng, cân bằng và vượt thời gian, nhấn mạnh trọng lượng đạo đức, chiều sâu tâm lý và cấu trúc mạch lạc. Cảm xúc được kiềm chế; ngôn ngữ chính xác; ý nghĩa được phát triển qua những đoạn văn dài, sâu sắc và những câu văn tự nhiên, cho phép hình ảnh, cử chỉ và bối cảnh tự nói lên ý nghĩa của chúng thay vì những lời giải thích trực tiếp hoặc định nghĩa khái niệm. Câu chuyện mang tính trang trọng riêng thông qua sự tiến triển chứ không phải lời bình luận.\n\nCác yếu tố chính\n◟Những câu văn thể hiện sự cân bằng và cảm giác kiến trúc.\n◟Sự hấp dẫn giữa đạo đức và cảm xúc.\n◟Hình ảnh mang tính biểu tượng nhưng cũng rất sâu sắc.\n◟Sự tự vấn sâu sắc dựa trên những trải nghiệm sống cụ thể.\n◟Bối cảnh xã hội hoặc lịch sử định hình hành vi.\n◟Những cảm xúc được kiểm soát, điều độ và vang vọng một cách nhẹ nhàng.`
  },
  {
    id: 'style_12',
    title: 'Sống động, bồn chồn, đậm chất con người',
    description: 'Tổng thể: sống động, bồn chồn, đậm chất con người - những câu chữ như đang thở...',
    content: `Một phong cách sống động, giàu hành động, được định hình bởi hơi thở, nhịp điệu và sự hỗn loạn thầm lặng của cuộc sống thực. Văn xuôi trôi chảy qua những đoạn văn dài, theo dòng suy nghĩ, trong khi những câu ngắn xen vào như những sự gián đoạn thực sự. Cảm xúc không được gọi tên; chúng xuất hiện trong sự do dự, giọng điệu, sự mâu thuẫn, hoặc cách ai đó với lấy một chiếc cốc mà không nhìn.\n\nCác yếu tố chính\n◟Hành động quan trọng hơn chi tiết.\n◟Các đoạn văn dài với cấu trúc nhịp điệu khác nhau về độ dài câu.\n◟Hãy chấp nhận những mâu thuẫn và đừng can thiệp để chúng được sửa chữa.\n◟Các đối tượng được sử dụng như một đặc điểm thông thường, chứ không phải như những biểu tượng.\n◟Nơi này mang lại cảm giác như một không gian sống của con người.\n◟Cảm xúc được truyền tải thông qua thời điểm, sự né tránh và giọng điệu`
  }
];

interface Character {
  id: string;
  name: string;
  createdAt: number;
}

interface Tab1CreateBotProps {
  onSaveComplete?: () => void;
  activeCharacterId: string;
  characters: Character[];
  onSelectCharacter: (id: string) => void;
  onCreateCharacter: () => void;
  onDeleteCharacter: (id: string) => void;
  onUpdateName: (id: string, name: string) => void;
}

export default function Tab1CreateBot({ 
  onSaveComplete, 
  activeCharacterId, 
  characters, 
  onSelectCharacter, 
  onCreateCharacter, 
  onDeleteCharacter,
  onUpdateName
}: Tab1CreateBotProps) {
  // Helper for character-specific keys
  const getCharKey = (key: string) => `${key}_${activeCharacterId}`;

  const [info, setInfo] = useState(() => localStorage.getItem(getCharKey('banhnho_bot_info')) || TEMPLATE_1);
  const [personality, setPersonality] = useState(() => localStorage.getItem(getCharKey('banhnho_bot_personality')) || TEMPLATE_2);
  const [selectedStyles, setSelectedStyles] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(getCharKey('banhnho_bot_style_selected'));
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [customStyle, setCustomStyle] = useState(() => localStorage.getItem(getCharKey('banhnho_bot_style_custom')) || '');
  const [carrdBio, setCarrdBio] = useState(() => localStorage.getItem(getCharKey('banhnho_carrd_bio')) || '');
  const [carrdDescription, setCarrdDescription] = useState(() => localStorage.getItem(getCharKey('banhnho_carrd_description')) || '');
  const [carrdName, setCarrdName] = useState(() => localStorage.getItem(getCharKey('banhnho_carrd_name')) || '');
  const [carrdAge, setCarrdAge] = useState(() => localStorage.getItem(getCharKey('banhnho_carrd_age')) || '');
  const [carrdHobbies, setCarrdHobbies] = useState(() => localStorage.getItem(getCharKey('banhnho_carrd_hobbies')) || '');
  const [carrdAppearance, setCarrdAppearance] = useState(() => localStorage.getItem(getCharKey('banhnho_carrd_appearance')) || '');
  const [carrdGame, setCarrdGame] = useState(() => localStorage.getItem(getCharKey('banhnho_carrd_game')) || '');
  const [carrdMovies, setCarrdMovies] = useState(() => localStorage.getItem(getCharKey('banhnho_carrd_movies')) || '');
  const [carrdReview, setCarrdReview] = useState(() => localStorage.getItem(getCharKey('banhnho_carrd_review')) || '');
  const [carrdJob, setCarrdJob] = useState(() => localStorage.getItem(getCharKey('banhnho_carrd_job')) || '');
  const [carrdSocials, setCarrdSocials] = useState(() => localStorage.getItem(getCharKey('banhnho_carrd_socials')) || '');
  const [carrdIntro, setCarrdIntro] = useState(() => localStorage.getItem(getCharKey('banhnho_carrd_intro')) || '');
  const [carrdPast, setCarrdPast] = useState(() => localStorage.getItem(getCharKey('banhnho_carrd_past')) || '');
  const [carrdMustKnow, setCarrdMustKnow] = useState(() => localStorage.getItem(getCharKey('banhnho_carrd_must_know')) || '');
  const [carrdLifeSummary, setCarrdLifeSummary] = useState(() => localStorage.getItem(getCharKey('banhnho_carrd_life_summary')) || '');
  const [isSaved, setIsSaved] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Update state when activeCharacterId changes
  useEffect(() => {
    setInfo(localStorage.getItem(getCharKey('banhnho_bot_info')) || TEMPLATE_1);
    setPersonality(localStorage.getItem(getCharKey('banhnho_bot_personality')) || TEMPLATE_2);
    const savedStyles = localStorage.getItem(getCharKey('banhnho_bot_style_selected'));
    setSelectedStyles(savedStyles ? JSON.parse(savedStyles) : []);
    setCustomStyle(localStorage.getItem(getCharKey('banhnho_bot_style_custom')) || '');
    
    setCarrdName(localStorage.getItem(getCharKey('banhnho_carrd_name')) || '');
    setCarrdBio(localStorage.getItem(getCharKey('banhnho_carrd_bio')) || '');
    setCarrdDescription(localStorage.getItem(getCharKey('banhnho_carrd_description')) || '');
    setCarrdAge(localStorage.getItem(getCharKey('banhnho_carrd_age')) || '');
    setCarrdHobbies(localStorage.getItem(getCharKey('banhnho_carrd_hobbies')) || '');
    setCarrdAppearance(localStorage.getItem(getCharKey('banhnho_carrd_appearance')) || '');
    setCarrdGame(localStorage.getItem(getCharKey('banhnho_carrd_game')) || '');
    setCarrdMovies(localStorage.getItem(getCharKey('banhnho_carrd_movies')) || '');
    setCarrdReview(localStorage.getItem(getCharKey('banhnho_carrd_review')) || '');
    setCarrdJob(localStorage.getItem(getCharKey('banhnho_carrd_job')) || '');
    setCarrdSocials(localStorage.getItem(getCharKey('banhnho_carrd_socials')) || '');
    setCarrdIntro(localStorage.getItem(getCharKey('banhnho_carrd_intro')) || '');
    setCarrdPast(localStorage.getItem(getCharKey('banhnho_carrd_past')) || '');
    setCarrdMustKnow(localStorage.getItem(getCharKey('banhnho_carrd_must_know')) || '');
    setCarrdLifeSummary(localStorage.getItem(getCharKey('banhnho_carrd_life_summary')) || '');
  }, [activeCharacterId]);

  const charSafeSetItem = (key: string, value: string) => {
    try { localStorage.setItem(getCharKey(key), value); } catch (e) { console.error('Storage full'); }
  };

  // Removed auto-save useEffects to prevent data corruption on character switch
  // Data is now saved explicitly via handleSave button

  const handleSave = () => {
    // Save all current state to localStorage for the active character
    charSafeSetItem('banhnho_bot_info', info);
    charSafeSetItem('banhnho_bot_personality', personality);
    charSafeSetItem('banhnho_bot_style_selected', JSON.stringify(selectedStyles));
    charSafeSetItem('banhnho_bot_style_custom', customStyle);
    charSafeSetItem('banhnho_carrd_bio', carrdBio);
    charSafeSetItem('banhnho_carrd_description', carrdDescription);
    charSafeSetItem('banhnho_carrd_name', carrdName);
    charSafeSetItem('banhnho_carrd_age', carrdAge);
    charSafeSetItem('banhnho_carrd_hobbies', carrdHobbies);
    charSafeSetItem('banhnho_carrd_appearance', carrdAppearance);
    charSafeSetItem('banhnho_carrd_game', carrdGame);
    charSafeSetItem('banhnho_carrd_movies', carrdMovies);
    charSafeSetItem('banhnho_carrd_review', carrdReview);
    charSafeSetItem('banhnho_carrd_job', carrdJob);
    charSafeSetItem('banhnho_carrd_socials', carrdSocials);
    charSafeSetItem('banhnho_carrd_intro', carrdIntro);
    charSafeSetItem('banhnho_carrd_past', carrdPast);
    charSafeSetItem('banhnho_carrd_must_know', carrdMustKnow);
    charSafeSetItem('banhnho_carrd_life_summary', carrdLifeSummary);

    const combinedStyle = [
      ...selectedStyles.map(id => PREDEFINED_STYLES.find(s => s.id === id)?.content).filter(Boolean),
      customStyle
    ].filter(Boolean).join('\n\n');
    charSafeSetItem('banhnho_bot_style', combinedStyle);

    setIsSaved(true);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      if (onSaveComplete) onSaveComplete();
    }, 2000);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-8 pb-24 font-sans text-[#8A7D85]">
      {/* Character Manager */}
      <div className="bg-white/60 border border-[#F9C6D4]/30 rounded-2xl p-4 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-[#8A7D85] flex items-center gap-2">
            <Users size={20} /> Danh sách nhân vật
          </h3>
          <button 
            onClick={onCreateCharacter}
            className="bg-[#F3B4C2] text-white p-2 rounded-full hover:bg-[#F9C6D4] transition-all shadow-md active:scale-95"
            title="Tạo nhân vật mới"
          >
            <Plus size={24} />
          </button>
        </div>
        
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {characters.map((char) => (
            <div 
              key={char.id}
              className={`flex items-center gap-2 min-w-[160px] p-2 rounded-xl border transition-all cursor-pointer relative ${
                activeCharacterId === char.id 
                  ? 'bg-[#F9DDE3] border-[#F3C6D1] shadow-sm ring-1 ring-[#F3C6D1]' 
                  : 'bg-[#FEF9E7] border-[#F9E79F] hover:bg-[#FFF9C4]'
              }`}
              onClick={() => onSelectCharacter(char.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  {activeCharacterId === char.id && <div className="w-1.5 h-1.5 rounded-full bg-[#F3B4C2] animate-pulse"></div>}
                  <input 
                    type="text"
                    value={char.name}
                    onChange={(e) => onUpdateName(char.id, e.target.value)}
                    className="bg-transparent border-none p-0 text-xs font-bold text-[#8A7D85] focus:ring-0 w-full"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              {characters.length > 1 && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Bạn có chắc muốn xóa nhân vật "${char.name}"?`)) {
                      onDeleteCharacter(char.id);
                    }
                  }}
                  className="text-[#9E919A] hover:text-red-400 p-1"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Header */}
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-3xl font-bold text-[#8A7D85] drop-shadow-[0_0_12px_rgba(249,198,212,0.35)]">Tạo Bot Char Chuyên Nghiệp</h2>
        <p className="text-[#9E919A] opacity-80">Thiết lập chi tiết nhân vật của bạn</p>
      </div>

      {/* Card 1: Thông tin cơ bản */}
      <div className="bg-[rgba(255,255,255,0.65)] backdrop-blur-md border border-[rgba(249,221,227,0.5)] shadow-[0_4px_20px_rgba(228,219,214,0.4)] rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[#F9C6D4] opacity-10 mix-blend-soft-light pointer-events-none"></div>
        <h3 className="text-xl font-bold text-[#8A7D85] mb-4 flex items-center gap-2 drop-shadow-[0_0_12px_rgba(249,198,212,0.35)]">
          <span className="bg-[#F3C6D1]/50 px-3 py-1 rounded-lg shadow-sm">Ô 1</span> Thông tin cơ bản & Ngoại hình
        </h3>
        <textarea 
          value={info}
          onChange={(e) => setInfo(e.target.value)}
          className="w-full h-[400px] p-4 bg-[#F3C6D1]/50 border border-[#F3C6D1] rounded-xl text-[#8A7D85] focus:outline-none focus:ring-2 focus:ring-[#F9DDE3] resize-y opacity-85 leading-relaxed placeholder:text-[#9E919A]"
          placeholder="Nhập thông tin..."
        />
      </div>

      {/* Card 2: Tính cách */}
      <div className="bg-[rgba(255,255,255,0.65)] backdrop-blur-md border border-[rgba(249,221,227,0.5)] shadow-[0_4px_20px_rgba(228,219,214,0.4)] rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[#F9C6D4] opacity-10 mix-blend-soft-light pointer-events-none"></div>
        <h3 className="text-xl font-bold text-[#8A7D85] mb-4 flex items-center gap-2 drop-shadow-[0_0_12px_rgba(249,198,212,0.35)]">
          <span className="bg-[#F3C6D1]/50 px-3 py-1 rounded-lg shadow-sm">Ô 2</span> Tính cách & Tâm lý
        </h3>
        <textarea 
          value={personality}
          onChange={(e) => setPersonality(e.target.value)}
          className="w-full h-[400px] p-4 bg-[#F3C6D1]/50 border border-[#F3C6D1] rounded-xl text-[#8A7D85] focus:outline-none focus:ring-2 focus:ring-[#F9DDE3] resize-y opacity-85 leading-relaxed placeholder:text-[#9E919A]"
          placeholder="Nhập tính cách..."
        />
      </div>

      {/* Card 3: Phong cách viết */}
      <div className="bg-[rgba(255,255,255,0.65)] backdrop-blur-md border border-[rgba(249,221,227,0.5)] shadow-[0_4px_20px_rgba(228,219,214,0.4)] rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[#F9C6D4] opacity-10 mix-blend-soft-light pointer-events-none"></div>
        <h3 className="text-xl font-bold text-[#8A7D85] mb-4 flex items-center gap-2 drop-shadow-[0_0_12px_rgba(249,198,212,0.35)]">
          <span className="bg-[#F3C6D1]/50 px-3 py-1 rounded-lg shadow-sm">Ô 3</span> Phong cách viết
        </h3>
        
        <div className="space-y-6 relative z-10">
          <div>
            <h4 className="font-semibold text-[#8A7D85] mb-3">Chọn phong cách viết (Có thể chọn nhiều):</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {PREDEFINED_STYLES.map((style) => (
                <div 
                  key={style.id}
                  onClick={() => {
                    setSelectedStyles(prev => 
                      prev.includes(style.id) 
                        ? prev.filter(id => id !== style.id)
                        : [...prev, style.id]
                    );
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                    selectedStyles.includes(style.id)
                      ? 'bg-[#F9DDE3] border-[#F3C6D1] shadow-md scale-[1.02]'
                      : 'bg-white/50 border-[#F3C6D1]/50 hover:bg-[#F3C6D1]/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                      selectedStyles.includes(style.id) ? 'bg-[#8A7D85] border-[#8A7D85]' : 'border-[#9E919A]'
                    }`}>
                      {selectedStyles.includes(style.id) && (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <h5 className="font-bold text-[#8A7D85] text-sm mb-1">{style.title}</h5>
                      <p className="text-xs text-[#9E919A] line-clamp-2">{style.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-[#8A7D85] mb-3">Hoặc tự nhập phong cách viết của bạn:</h4>
            <textarea 
              value={customStyle}
              onChange={(e) => setCustomStyle(e.target.value)}
              className="w-full h-[200px] p-4 bg-[#F3C6D1]/50 border border-[#F3C6D1] rounded-xl text-[#8A7D85] focus:outline-none focus:ring-2 focus:ring-[#F9DDE3] resize-y opacity-85 leading-relaxed placeholder:text-[#9E919A]"
              placeholder="Nhập phong cách viết tùy chỉnh của bạn..."
            />
          </div>
        </div>
      </div>
      
      {/* Card 4: Carrd Profile Display */}
      <div className="bg-[rgba(255,255,255,0.65)] backdrop-blur-md border border-[rgba(249,221,227,0.5)] shadow-[0_4px_20px_rgba(228,219,214,0.4)] rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[#F9C6D4] opacity-10 mix-blend-soft-light pointer-events-none"></div>
        <h3 className="text-xl font-bold text-[#8A7D85] mb-4 flex items-center gap-2 drop-shadow-[0_0_12px_rgba(249,198,212,0.35)]">
          <span className="bg-[#F3C6D1]/50 px-3 py-1 rounded-lg shadow-sm">Ô 4</span> Nội dung hiển thị trên Thẻ Card (Showcase)
        </h3>
        
        <div className="space-y-4 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-[#8A7D85] mb-2">Tên xuất hiện trên thẻ card:</label>
              <input 
                type="text"
                value={carrdName}
                onChange={(e) => setCarrdName(e.target.value)}
                className="w-full p-3 bg-[#F3C6D1]/50 border border-[#F3C6D1] rounded-xl text-[#8A7D85] focus:outline-none focus:ring-2 focus:ring-[#F9DDE3]"
                placeholder="Ví dụ: Ren"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#8A7D85] mb-2">Tuổi:</label>
              <input 
                type="text"
                value={carrdAge}
                onChange={(e) => setCarrdAge(e.target.value)}
                className="w-full p-3 bg-[#F3C6D1]/50 border border-[#F3C6D1] rounded-xl text-[#8A7D85] focus:outline-none focus:ring-2 focus:ring-[#F9DDE3]"
                placeholder="Ví dụ: 20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-[#8A7D85] mb-2">Nghề nghiệp:</label>
              <input 
                type="text"
                value={carrdJob}
                onChange={(e) => setCarrdJob(e.target.value)}
                className="w-full p-3 bg-[#F3C6D1]/50 border border-[#F3C6D1] rounded-xl text-[#8A7D85] focus:outline-none focus:ring-2 focus:ring-[#F9DDE3]"
                placeholder="Ví dụ: Sinh viên"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#8A7D85] mb-2">Tài khoản mạng xã hội:</label>
              <input 
                type="text"
                value={carrdSocials}
                onChange={(e) => setCarrdSocials(e.target.value)}
                className="w-full p-3 bg-[#F3C6D1]/50 border border-[#F3C6D1] rounded-xl text-[#8A7D85] focus:outline-none focus:ring-2 focus:ring-[#F9DDE3]"
                placeholder="Ví dụ: @ren_insta, fb.com/ren..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-[#8A7D85] mb-2">About me:</label>
            <textarea 
              value={carrdBio}
              onChange={(e) => setCarrdBio(e.target.value)}
              className="w-full h-[80px] p-3 bg-[#F3C6D1]/50 border border-[#F3C6D1] rounded-xl text-[#8A7D85] focus:outline-none focus:ring-2 focus:ring-[#F9DDE3] resize-none"
              placeholder="Mỗi dòng 1 đặc điểm ngắn gọn..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-[#8A7D85] mb-2">Sở thích:</label>
              <textarea 
                value={carrdHobbies}
                onChange={(e) => setCarrdHobbies(e.target.value)}
                className="w-full h-[100px] p-3 bg-[#F3C6D1]/50 border border-[#F3C6D1] rounded-xl text-[#8A7D85] focus:outline-none focus:ring-2 focus:ring-[#F9DDE3]"
                placeholder="Nhập sở thích..."
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#8A7D85] mb-2">Ngoại hình:</label>
              <textarea 
                value={carrdAppearance}
                onChange={(e) => setCarrdAppearance(e.target.value)}
                className="w-full h-[100px] p-3 bg-[#F3C6D1]/50 border border-[#F3C6D1] rounded-xl text-[#8A7D85] focus:outline-none focus:ring-2 focus:ring-[#F9DDE3]"
                placeholder="Mô tả ngoại hình..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-[#8A7D85] mb-2">Game:</label>
              <input 
                type="text"
                value={carrdGame}
                onChange={(e) => setCarrdGame(e.target.value)}
                className="w-full p-3 bg-[#F3C6D1]/50 border border-[#F3C6D1] rounded-xl text-[#8A7D85] focus:outline-none focus:ring-2 focus:ring-[#F9DDE3]"
                placeholder="Game yêu thích..."
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#8A7D85] mb-2">Phim:</label>
              <input 
                type="text"
                value={carrdMovies}
                onChange={(e) => setCarrdMovies(e.target.value)}
                className="w-full p-3 bg-[#F3C6D1]/50 border border-[#F3C6D1] rounded-xl text-[#8A7D85] focus:outline-none focus:ring-2 focus:ring-[#F9DDE3]"
                placeholder="Phim yêu thích..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-[#8A7D85] mb-2">Giới thiệu về bản thân (bot char):</label>
            <textarea 
              value={carrdIntro}
              onChange={(e) => setCarrdIntro(e.target.value)}
              className="w-full h-[100px] p-3 bg-[#F3C6D1]/50 border border-[#F3C6D1] rounded-xl text-[#8A7D85] focus:outline-none focus:ring-2 focus:ring-[#F9DDE3]"
              placeholder="Giới thiệu chi tiết về bot..."
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-[#8A7D85] mb-2">Quá khứ:</label>
            <textarea 
              value={carrdPast}
              onChange={(e) => setCarrdPast(e.target.value)}
              className="w-full h-[100px] p-3 bg-[#F3C6D1]/50 border border-[#F3C6D1] rounded-xl text-[#8A7D85] focus:outline-none focus:ring-2 focus:ring-[#F9DDE3]"
              placeholder="Mô tả quá khứ..."
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-[#8A7D85] mb-2">Những điều bạn cần biết về bot char:</label>
            <textarea 
              value={carrdMustKnow}
              onChange={(e) => setCarrdMustKnow(e.target.value)}
              className="w-full h-[100px] p-3 bg-[#F3C6D1]/50 border border-[#F3C6D1] rounded-xl text-[#8A7D85] focus:outline-none focus:ring-2 focus:ring-[#F9DDE3]"
              placeholder="Lưu ý quan trọng..."
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-[#8A7D85] mb-2">Sơ lược về cuộc đời:</label>
            <textarea 
              value={carrdLifeSummary}
              onChange={(e) => setCarrdLifeSummary(e.target.value)}
              className="w-full h-[100px] p-3 bg-[#F3C6D1]/50 border border-[#F3C6D1] rounded-xl text-[#8A7D85] focus:outline-none focus:ring-2 focus:ring-[#F9DDE3]"
              placeholder="Tóm tắt cuộc đời..."
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-[#8A7D85] mb-2">Đánh giá tổng quan:</label>
            <textarea 
              value={carrdReview}
              onChange={(e) => setCarrdReview(e.target.value)}
              className="w-full h-[80px] p-3 bg-[#F3C6D1]/50 border border-[#F3C6D1] rounded-xl text-[#8A7D85] focus:outline-none focus:ring-2 focus:ring-[#F9DDE3]"
              placeholder="Đánh giá ngắn gọn..."
            />
          </div>
        </div>
      </div>
      
      {/* Save & Showcase Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
        <button 
          onClick={handleSave}
          disabled={isSaved}
          className={`w-full sm:w-auto px-10 py-4 text-white font-bold rounded-full shadow-[0_0_12px_rgba(249,198,212,0.5)] transition-all ${isSaved ? 'bg-[#4CAF50]' : 'bg-gradient-to-r from-[#F9DDE3] to-[#F3C6D1] hover:scale-105 active:scale-95'}`}
        >
          {isSaved ? '✓ Đã lưu thiết lập' : 'Lưu Thiết Lập Bot'}
        </button>
        
        <button 
          onClick={() => onSaveComplete?.()}
          className="w-full sm:w-auto px-10 py-4 bg-white text-[#8A7D85] font-bold rounded-full border-2 border-[#F9C6D4] shadow-sm hover:bg-[#FDF2F5] transition-all active:scale-95"
        >
          Xem Trưng Bày
        </button>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-md border border-[#F9DDE3] text-[#8A7D85] px-6 py-3 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 z-50">
          <div className="w-2 h-2 rounded-full bg-[#4CAF50]"></div>
          <span className="font-medium">Đã lưu thiết lập Bot Char thành công!</span>
        </div>
      )}
    </div>
  );
}
