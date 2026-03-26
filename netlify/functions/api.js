// โค้ดนี้รันบน Netlify Server (Universal Proxy)
// ทำหน้ารับภาระเป็นคนกลาง ส่งข้อมูลระหว่างเว็บไซต์ของคุณ ไปยัง Google Apps Script

const APPS_SCRIPT_BASE_URL = process.env.GAS_API_URL;

exports.handler = async (event, context) => {
  // 1. CORS Preflight (เผื่อป้องกันเบราว์เซอร์บล็อก)
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }

  try {
    let result;

    // --- 2. ถ้า Frontend เรียกใช้คำสั่งแบบ GET (เช่น ดึงข้อมูล / เช็คชื่อ) ---
    if (event.httpMethod === "GET") {
      // ดึง พารามิเตอร์ ทั้งหมดจาก URL ส่งต่อโดยตรง (เช่น ?action=checkUser&userId=123)
      const params = new URLSearchParams(event.queryStringParameters).toString();
      const fetchUrl = `${APPS_SCRIPT_BASE_URL}?${params}&callback=jsonpCallback`;
      
      const response = await fetch(fetchUrl);
      const text = await response.text();
      
      // แปลง JSONP ขยะของ Apps Script ให้เป็น JSON คลีนๆ
      const jsonpData = text.match(/jsonpCallback\((.*)\)/);
      result = jsonpData && jsonpData[1] 
          ? JSON.parse(jsonpData[1]) 
          : { error: 'Invalid response format from Apps Script' };
    
    // --- 3. ถ้า Frontend เรียกใช้คำสั่งแบบ POST (เช่น สมัครสมาชิก / บันทึกสัตว์เลี้ยง) ---
    } else if (event.httpMethod === "POST") {
      // ส่งข้อมูลก้อนทั้งหมด ข้ามไปหา Apps Script โดยตรง
      const response = await fetch(APPS_SCRIPT_BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: event.body, // รับจากหน้าเว็บมายังไง โยนไปอย่างนั้นเลย
      });
      result = await response.json();
      
    } else {
      return { 
          statusCode: 405, 
          body: JSON.stringify({ error: "Method Not Allowed" }) 
      };
    }

    // 4. ส่งผลลัพธ์กลับไปให้เว็บไซต์ (Frontend)
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(result),
    };

  } catch (error) {
    console.error("[API Proxy] error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: "Internal server error" }),
    };
  }
};
