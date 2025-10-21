// ตัวแปรเก็บข้อมูล
const imageInput = document.getElementById('imageInput');
const uploadBox = document.getElementById('uploadBox');
const previewSection = document.getElementById('previewSection');
const previewImage = document.getElementById('previewImage');
const resultSection = document.getElementById('resultSection');
const errorSection = document.getElementById('errorSection');
const errorMessage = document.getElementById('errorMessage');

// ⚠️ เปลี่ยน URL นี้ให้ตรงกับ Backend ของคุณ
const API_URL = 'https://aicoin-backend-1.onrender.com/detect';

// เมื่อเลือกไฟล์
imageInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    
    if (file) {
        // ตรวจสอบว่าเป็นไฟล์รูปภาพหรือไม่
        if (!file.type.startsWith('image/')) {
            showError('กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG, JPEG)');
            return;
        }
        
        // ตรวจสอบขนาดไฟล์ (ไม่เกิน 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showError('ไฟล์รูปใหญ่เกินไป (เกิน 5MB)<br>กรุณาเลือกรูปขนาดเล็กกว่า');
            return;
        }
        
        // แสดงภาพตัวอย่าง
        const reader = new FileReader();
        reader.onload = function(event) {
            previewImage.src = event.target.result;
            previewSection.style.display = 'block';
            resultSection.style.display = 'none';
            errorSection.style.display = 'none';
            
            // เลื่อนหน้าจอไปที่ภาพตัวอย่าง
            previewSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        };
        reader.readAsDataURL(file);
    }
});

// Drag and Drop
uploadBox.addEventListener('dragover', function(e) {
    e.preventDefault();
    uploadBox.style.borderColor = '#764ba2';
    uploadBox.style.background = '#f0f2ff';
});

uploadBox.addEventListener('dragleave', function(e) {
    e.preventDefault();
    uploadBox.style.borderColor = '#667eea';
    uploadBox.style.background = '#f8f9ff';
});

uploadBox.addEventListener('drop', function(e) {
    e.preventDefault();
    uploadBox.style.borderColor = '#667eea';
    uploadBox.style.background = '#f8f9ff';
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        imageInput.files = e.dataTransfer.files;
        imageInput.dispatchEvent(new Event('change'));
    }
});

// คลิกที่กล่องอัปโหลด
uploadBox.addEventListener('click', function() {
    imageInput.click();
});

// ฟังก์ชัน Ping Backend เพื่อปลุก (ถ้าหลับ)
async function wakeUpBackend() {
    try {
        console.log('🔔 กำลังปลุก Backend...');
        const response = await fetch(API_URL.replace('/detect', ''), {
            method: 'GET',
            signal: AbortSignal.timeout(10000) // timeout 10 วินาที
        });
        
        if (response.ok) {
            console.log('✅ Backend ตื่นแล้ว!');
            return true;
        }
        return false;
    } catch (error) {
        console.log('⏰ Backend กำลังตื่น... รอซักครู่');
        return false;
    }
}

// ฟังก์ชันนับเหรียญ (เวอร์ชันปรับปรุง)
async function detectCoins() {
    const file = imageInput.files[0];
    
    if (!file) {
        showError('กรุณาเลือกรูปภาพก่อน');
        return;
    }
    
    console.log('🔵 เริ่มต้นการนับเหรียญ');
    console.log('📄 ไฟล์:', file.name, 'ขนาด:', file.size, 'bytes');
    
    // แสดงสถานะกำลังโหลด
    const btnText = document.getElementById('btnText');
    const btnLoading = document.getElementById('btnLoading');
    const btnDetect = document.querySelector('.btn-detect');
    
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline-block';
    btnDetect.disabled = true;
    
    // ซ่อนผลลัพธ์เดิม
    resultSection.style.display = 'none';
    errorSection.style.display = 'none';
    
    console.log('⏳ ขั้นตอนที่ 1/2: ตรวจสอบสถานะ Backend...');
    
    // ลอง Ping Backend ก่อน
    await wakeUpBackend();
    
    // รอ 2 วินาทีให้ Backend พร้อม
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('⏳ ขั้นตอนที่ 2/2: ส่งรูปภาพ...');
    
    // เตรียมข้อมูลส่ง
    const formData = new FormData();
    formData.append('image', file);
    
    console.log('📤 กำลังส่ง Request ไปที่:', API_URL);
    
    try {
        // เพิ่ม Timeout เป็น 180 วินาที (3 นาที)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 180000);
        
        // ส่งข้อมูลไปที่ Backend
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData,
            signal: controller.signal,
            mode: 'cors',
            credentials: 'omit'
        });
        
        clearTimeout(timeoutId);
        
        console.log('📥 ได้รับ Response:', response.status, response.statusText);
        
        // ตรวจสอบ HTTP Status
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        // แปลง Response เป็น JSON
        const data = await response.json();
        
        console.log('✅ ข้อมูลที่ได้รับ:', data);
        
        // ตรวจสอบผลลัพธ์
        if (data.success) {
            console.log('🎉 สำเร็จ! พบเหรียญ:', data.total_count, 'เหรียญ');
            console.log('💰 มูลค่ารวม:', data.total_value, 'บาท');
            console.log('📊 รายละเอียด:', data.coin_details);
            showResult(data);
        } else {
            console.error('❌ Backend ส่ง Error:', data.error);
            showError(data.error || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        
        if (error.name === 'AbortError') {
            showError(
                '⏱️ หมดเวลา (Timeout)<br><br>' +
                'การประมวลผลใช้เวลานานเกินไป (เกิน 3 นาที)<br><br>' +
                '<strong>💡 คำแนะนำ:</strong><br>' +
                '1️⃣ <strong>รอ 1-2 นาที</strong> แล้วลองใหม่อีกครั้ง (Backend อาจกำลังตื่น)<br>' +
                '2️⃣ ลดขนาดรูปภาพให้เล็กกว่า 2MB<br>' +
                '3️⃣ Refresh หน้าเว็บ (F5) แล้วลองใหม่<br><br>' +
                '<a href="' + API_URL.replace('/detect', '') + '" target="_blank" style="color: #4CAF50; font-weight: bold;">🔗 คลิกตรวจสอบสถานะ Backend</a>'
            );
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            showError(
                '🔌 ไม่สามารถเชื่อมต่อกับ Backend ได้<br><br>' +
                '<strong>สาเหตุที่เป็นไปได้:</strong><br>' +
                '1️⃣ Backend กำลังหลับ (ครั้งแรกต้องรอ 30-60 วินาที)<br>' +
                '2️⃣ เครือข่ายมีปัญหา<br>' +
                '3️⃣ Backend มี Error<br><br>' +
                '<strong>💡 วิธีแก้:</strong><br>' +
                '• <strong>รอ 1 นาที แล้วลองใหม่</strong><br>' +
                '• เช็คว่า Backend ทำงานหรือไม่: <a href="' + API_URL.replace('/detect', '') + '" target="_blank" style="color: #4CAF50; font-weight: bold;">คลิกที่นี่</a><br>' +
                '• ลอง Refresh หน้าเว็บ (F5)'
            );
        } else {
            showError(
                '❌ เกิดข้อผิดพลาด<br><br>' +
                '<code style="background: #f5f5f5; padding: 10px; display: block; border-radius: 5px; color: #d32f2f;">' + 
                error.message + 
                '</code><br>' +
                '<a href="' + API_URL.replace('/detect', '') + '" target="_blank" style="color: #4CAF50;">ตรวจสอบ Backend</a>'
            );
        }
    } finally {
        // คืนสถานะปุ่ม
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
        btnDetect.disabled = false;
        
        console.log('🔵 เสร็จสิ้นการประมวลผล');
    }
}

// ฟังก์ชันแสดงผลลัพธ์
function showResult(data) {
    console.log('📺 กำลังแสดงผลลัพธ์...');
    
    // แสดงรูปที่มีกรอบ
    const resultImage = document.getElementById('resultImage');
    resultImage.src = 'data:image/jpeg;base64,' + data.image_with_boxes;
    console.log('🖼️ โหลดรูปที่มีกรอบเรียบร้อย');
    
    // แสดงมูลค่ารวม
    const totalValue = document.getElementById('totalValue');
    console.log('💰 ตั้งค่ามูลค่ารวม:', data.total_value, 'บาท');
    
    // แสดงรายละเอียดเหรียญ
    updateCoinDetail('coin1baht', data.coin_details['1baht']);
    updateCoinDetail('coin5baht', data.coin_details['5baht']);
    updateCoinDetail('coin10baht', data.coin_details['10baht']);
    
    // แสดงผลลัพธ์
    resultSection.style.display = 'block';
    errorSection.style.display = 'none';
    
    console.log('✅ แสดงผลลัพธ์สำเร็จ');
    
    // เลื่อนหน้าจอไปที่ผลลัพธ์
    setTimeout(() => {
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    
    // เอฟเฟกต์นับเลข
    animateCount(data.total_value, totalValue);
}

// ฟังก์ชันอัปเดตรายละเอียดเหรียญ
function updateCoinDetail(elementId, count) {
    const element = document.getElementById(elementId);
    const countSpan = element.querySelector('.coin-count');
    countSpan.textContent = `${count} เหรียญ`;
    
    console.log(`🪙 อัปเดต ${elementId}: ${count} เหรียญ`);
    
    // ซ่อนรายการที่มีจำนวน 0
    if (count === 0) {
        element.style.opacity = '0.5';
    } else {
        element.style.opacity = '1';
    }
}

// ฟังก์ชันแสดงข้อผิดพลาด
function showError(message) {
    errorMessage.innerHTML = message;
    errorSection.style.display = 'block';
    resultSection.style.display = 'none';
    
    // เลื่อนหน้าจอไปที่ข้อผิดพลาด
    errorSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ฟังก์ชันรีเซ็ตหน้าจอ
function resetPage() {
    console.log('🔄 รีเซ็ตหน้าจอ');
    imageInput.value = '';
    previewSection.style.display = 'none';
    resultSection.style.display = 'none';
    errorSection.style.display = 'none';
    
    // เลื่อนหน้าจอกลับไปด้านบน
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// เอฟเฟกต์นับเลข
function animateCount(target, element) {
    let current = 0;
    const increment = target / 30;
    const duration = 1000;
    const stepTime = duration / 30;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current);
        }
    }, stepTime);
}

// เช็คสถานะ Backend เมื่อโหลดหน้าเว็บ
window.addEventListener('load', async function() {
    try {
        const response = await fetch(API_URL.replace('/detect', ''), {
            signal: AbortSignal.timeout(5000)
        });
        if (response.ok) {
            console.log('✅ เชื่อมต่อ Backend สำเร็จ');
        }
    } catch (error) {
        console.warn('⚠️ ไม่สามารถเชื่อมต่อ Backend ได้ (อาจกำลังหลับ)');
    }
});