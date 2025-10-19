// ตัวแปรเก็บข้อมูล
const imageInput = document.getElementById('imageInput');
const uploadBox = document.getElementById('uploadBox');
const previewSection = document.getElementById('previewSection');
const previewImage = document.getElementById('previewImage');
const resultSection = document.getElementById('resultSection');
const errorSection = document.getElementById('errorSection');
const errorMessage = document.getElementById('errorMessage');

// URL ของ Backend
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

// ฟังก์ชันนับเหรียญ
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
    
    // เตรียมข้อมูลส่ง
    const formData = new FormData();
    formData.append('image', file);
    
    console.log('📤 กำลังส่ง Request ไปที่:', API_URL);
    
    try {
        // ตั้ง Timeout 30 วินาที
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        // ส่งข้อมูลไปที่ Backend
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log('📥 ได้รับ Response:', response.status, response.statusText);
        
        // ตรวจสอบ HTTP Status
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
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
            showError('⏱️ หมดเวลา (Timeout)<br><br>การประมวลผลใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง');
        } else if (error.message.includes('Failed to fetch')) {
            showError(
                '🔌 ไม่สามารถเชื่อมต่อกับ Server ได้<br><br>' +
                'กรุณาตรวจสอบว่า:<br>' +
                '1️⃣ Backend กำลังทำงานอยู่ (python app.py)<br>' +
                '2️⃣ Server อยู่ที่ ' + API_URL.replace('/detect', '') + '<br>' +
                '3️⃣ ไม่มี Firewall หรือ Antivirus บล็อก'
            );
        } else {
            showError('❌ เกิดข้อผิดพลาด:<br><br>' + error.message);
        }
    } finally {
        // คืนสถานะปุ่ม
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
        btnDetect.disabled = false;
        
        console.log('🔵 เสร็จสิ้นการประมวลผล');
    }
}

// ฟังก์ชันแสดงผลลัพธ์ (เวอร์ชันอัปเกรด)
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
    const duration = 1000; // 1 วินาที
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
        const response = await fetch('http://localhost:5000/');
        if (response.ok) {
            console.log('✅ เชื่อมต่อ Backend สำเร็จ');
        }
    } catch (error) {
        console.warn('⚠️ ไม่สามารถเชื่อมต่อ Backend ได้ กรุณาเปิด Backend ก่อน');
    }
});
