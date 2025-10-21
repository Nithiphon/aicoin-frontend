// ตัวแปรเก็บข้อมูล
const imageInput = document.getElementById('imageInput');
const uploadBox = document.getElementById('uploadBox');
const previewSection = document.getElementById('previewSection');
const previewImage = document.getElementById('previewImage');
const resultSection = document.getElementById('resultSection');
const errorSection = document.getElementById('errorSection');
const errorMessage = document.getElementById('errorMessage');

// ⚠️ เปลี่ยน URL นี้ให้ตรงกับ Backend ของคุณ
const API_URL = 'https://test-coin-backend-2.onrender.com/detect';

// เมื่อเลือกไฟล์
imageInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    
    if (file) {
        // ตรวจสอบว่าเป็นไฟล์รูปภาพหรือไม่
        if (!file.type.startsWith('image/')) {
            showError('กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG, JPEG)');
            return;
        }
        
        // ตรวจสอบขนาดไฟล์ (ไม่เกิน 50MB)
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxSize) {
            showError(
                `ไฟล์รูปใหญ่เกินไป (เกิน 50MB)<br>
                 ขนาดไฟล์ปัจจุบัน: ${(file.size / 1024 / 1024).toFixed(1)}MB<br>
                 กรุณาเลือกรูปขนาดเล็กกว่า`
            );
            return;
        }
        
        // แสดงภาพตัวอย่าง
        const reader = new FileReader();
        reader.onload = function(event) {
            previewImage.src = event.target.result;
            previewSection.style.display = 'block';
            resultSection.style.display = 'none';
            errorSection.style.display = 'none';
            
            // แสดงข้อมูลไฟล์
            console.log('📁 ไฟล์ที่เลือก:', file.name);
            console.log('📊 ขนาด:', (file.size / 1024 / 1024).toFixed(2), 'MB');
            console.log('📝 ประเภท:', file.type);
            
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
        // ตรวจสอบขนาดไฟล์
        const maxSize = 50 * 1024 * 1024;
        if (file.size > maxSize) {
            showError(`ไฟล์ใหญ่เกิน ${maxSize/1024/1024}MB`);
            return;
        }
        imageInput.files = e.dataTransfer.files;
        imageInput.dispatchEvent(new Event('change'));
    }
});

// คลิกที่กล่องอัปโหลด
uploadBox.addEventListener('click', function() {
    imageInput.click();
});

// ฟังก์ชันตรวจสอบสถานะ backend
async function checkBackendStatus() {
    try {
        console.log('🔔 กำลังตรวจสอบสถานะ Backend...');
        const response = await fetch(API_URL.replace('/detect', '/health'), {
            method: 'GET',
            signal: AbortSignal.timeout(10000) // timeout 10 วินาที
        });
        
        if (response.ok) {
            console.log('✅ Backend พร้อมใช้งาน!');
            return true;
        }
        return false;
    } catch (error) {
        console.log('❌ Backend ยังไม่พร้อม:', error.message);
        return false;
    }
}

// ฟังก์ชัน fetch แบบมี retry
async function fetchWithRetry(url, options, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔄 พยายามครั้งที่ ${attempt}/${maxRetries}`);
            const response = await fetch(url, options);
            
            if (response.status === 502 || response.status === 503) {
                throw new Error(`Backend unavailable: ${response.status}`);
            }
            
            return response;
        } catch (error) {
            lastError = error;
            console.log(`❌ พยายามครั้งที่ ${attempt} ล้มเหลว:`, error.message);
            
            if (attempt < maxRetries) {
                const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
                console.log(`⏳ รอ ${delay/1000} วินาที แล้วลองใหม่...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    throw lastError;
}

// ฟังก์ชันนับเหรียญ (รองรับไฟล์ใหญ่)
async function detectCoins() {
    const file = imageInput.files[0];
    
    if (!file) {
        showError('กรุณาเลือกรูปภาพก่อน');
        return;
    }
    
    console.log('🔵 เริ่มต้นการนับเหรียญ');
    console.log('📄 ไฟล์:', file.name, 'ขนาด:', (file.size / 1024 / 1024).toFixed(2), 'MB');
    
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
    
    try {
        console.log('⏳ ขั้นตอนที่ 1/2: ตรวจสอบสถานะ Backend...');
        
        // ตรวจสอบ backend status ก่อน
        const isBackendReady = await checkBackendStatus();
        
        if (!isBackendReady) {
            console.log('⏳ Backend กำลังเริ่มทำงาน...');
            showError(
                '🔄 Backend กำลังเริ่มทำงาน<br><br>' +
                'กรุณารอ 30-60 วินาที แล้วลองใหม่อีกครั้ง<br><br>' +
                '<strong>สาเหตุ:</strong> Render Free Tier จะหยุดบริการเมื่อไม่ใช้งาน<br>' +
                '<strong>วิธีแก้:</strong> รอซักครู่แล้วกด "เริ่มนับเหรียญ" อีกครั้ง'
            );
            return;
        }

        // ถ้าไฟล์ใหญ่กว่า 10MB ให้แสดงคำเตือน
        if (file.size > 10 * 1024 * 1024) {
            console.log('⚠️  ไฟล์ขนาดใหญ่ กำลังประมวลผล... อาจใช้เวลานาน');
        }

        console.log('⏳ ขั้นตอนที่ 2/2: ส่งรูปภาพ...');
        
        // เตรียมข้อมูลส่ง
        const formData = new FormData();
        formData.append('image', file);
        
        console.log('📤 กำลังส่ง Request ไปที่:', API_URL);
        
        // ส่ง request พร้อม retry และ timeout 3 นาทีสำหรับไฟล์ใหญ่
        const response = await fetchWithRetry(API_URL, {
            method: 'POST',
            body: formData,
            signal: AbortSignal.timeout(180000) // 3 นาที
        }, 3); // retry 3 ครั้ง
        
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
            throw new Error(data.error || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        handleDetectionError(error, file.size);
    } finally {
        // คืนสถานะปุ่ม
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
        btnDetect.disabled = false;
        
        console.log('🔵 เสร็จสิ้นการประมวลผล');
    }
}

// ฟังก์ชันจัดการ error
function handleDetectionError(error, fileSize = 0) {
    let errorHtml = '';
    
    if (error.name === 'AbortError') {
        errorHtml = '⏱️ การเชื่อมต่อหมดเวลา<br><br>' +
                   'การประมวลผลใช้เวลานานเกินไป (เกิน 3 นาที)<br><br>' +
                   '<strong>💡 คำแนะนำ:</strong><br>' +
                   '1. ลดขนาดรูปภาพให้เล็กกว่า 10MB<br>' +
                   '2. ลองใช้รูปภาพอื่น<br>' +
                   '3. รอ 1 นาทีแล้วลองใหม่';
    } 
    else if (error.message.includes('502') || error.message.includes('503')) {
        errorHtml = '🔧 Backend กำลังมีปัญหา<br><br>' +
                   '<strong>สาเหตุที่เป็นไปได้:</strong><br>' +
                   '• Server กำลังเริ่มทำงาน (รอ 30-60 วินาที)<br>' +
                   '• Memory เกิน limit<br>' +
                   '• Request ใช้เวลานานเกินไป<br><br>' +
                   '<strong>💡 วิธีแก้:</strong><br>' +
                   '1. รอ 1 นาที แล้วลองใหม่<br>' +
                   '2. ลดขนาดรูปภาพให้เล็กกว่า 20MB<br>' +
                   '3. ลองใช้รูปภาพอื่น<br><br>' +
                   `<small>ขนาดไฟล์ปัจจุบัน: ${(fileSize / 1024 / 1024).toFixed(1)}MB</small>`;
    }
    else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorHtml = '🔌 ไม่สามารถเชื่อมต่อกับ Backend ได้<br><br>' +
                   '<strong>สาเหตุที่เป็นไปได้:</strong><br>' +
                   '1. Backend กำลังหลับ (ครั้งแรกต้องรอ 30-60 วินาที)<br>' +
                   '2. เครือข่ายมีปัญหา<br>' +
                   '3. Backend มี Error<br><br>' +
                   '<strong>💡 วิธีแก้:</strong><br>' +
                   '• <strong>รอ 1 นาที แล้วลองใหม่</strong><br>' +
                   '• เช็คว่า Backend ทำงานหรือไม่<br>' +
                   '• ลอง Refresh หน้าเว็บ (F5)';
    }
    else if (error.message.includes('Memory') || error.message.includes('memory')) {
        errorHtml = '💾 ไฟล์ใหญ่เกินไป<br><br>' +
                   'ระบบมี memory ไม่เพียงพอสำหรับประมวลผลรูปภาพนี้<br><br>' +
                   '<strong>กรุณาลอง:</strong><br>' +
                   '• ใช้รูปภาพที่เล็กกว่า (แนะนำ < 20MB)<br>' +
                   '• ลดความละเอียดของรูปภาพ<br>' +
                   '• ตัดรูปให้เหลือเฉพาะส่วนที่มีเหรียญ<br><br>' +
                   `<small>ขนาดไฟล์ปัจจุบัน: ${(fileSize / 1024 / 1024).toFixed(1)}MB</small>`;
    }
    else {
        errorHtml = '❌ เกิดข้อผิดพลาด<br><br>' +
                   `<code style="background: #f5f5f5; padding: 10px; display: block; border-radius: 5px; color: #d32f2f; font-size: 0.9em;">${error.message}</code>`;
    }
    
    showError(errorHtml);
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
    console.log('🌐 กำลังตรวจสอบการเชื่อมต่อ...');
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

// เพิ่ม global function สำหรับ onclick
window.detectCoins = detectCoins;
window.resetPage = resetPage;