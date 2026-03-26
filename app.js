const liffId = "2007981677-Z8m3omk4";
let isRegistered = false;
let userProfile = null; // เก็บข้อมูลผู้ใช้ไว้ทั่วแอป
const NETLIFY_FUNCTION_URL = "https://petpettest.netlify.app/.netlify/functions/api";

async function initializeLiff() {
  console.log("[LIFF] initialize start");

  await liff.init({ liffId });
  console.log("[LIFF] init done");

  // 🔐 AUTO LOGIN
  if (!liff.isLoggedIn()) {
    console.log("[LIFF] not logged in → redirect to login");
    liff.login();
    return;
  }

  console.log("[LIFF] logged in");

  userProfile = await liff.getProfile();
  console.log("[LIFF] profile", userProfile);

  // 🔍 เช็คว่าลงทะเบียนหรือยัง
  console.log("[CHECK] checking registration for", userProfile.userId);
  const result = await checkRegistration(userProfile.userId);
  isRegistered = result.registered;
  console.log("[CHECK] result", result);

  if (!result.registered) {
    console.log("[CHECK] user NOT registered → go register");
    const footer = document.querySelector(".footer-buttons");
    if (footer) footer.style.display = "none";
    if (location.hash !== "#register") {
      location.hash = "register";
    }
    return;
  }

  console.log("[CHECK] user registered");

  const footer = document.querySelector(".footer-buttons");
  if (footer) footer.style.display = "flex";

  // ✅ ใช้แบบนี้แทน
  if (!location.hash) {
    location.hash = "home";
  }

  // ดึงโปรไฟล์
  updateUserId(userProfile.userId);
  updateDisplayName(userProfile.displayName);
  updatePictureUrl(userProfile.pictureUrl);
}

function checkRegistration(userId) {
  console.log("[PROXY] prepare request", userId);
  // ใช้ fetch API เพื่อเรียก Proxy แทน
  return fetch(`${NETLIFY_FUNCTION_URL}?action=checkUser&userId=${encodeURIComponent(userId)}`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json(); // อ่านผลลัพธ์ที่เป็น JSON สะอาด
    })
    .then(data => {
      console.log("[PROXY] response", data);
      return data; 
    })
    .catch(error => {
      console.error("[PROXY] Error fetching registration:", error);
      return { registered: false };
    });
}

// ใส่ชื่อให้ทุก element  ที่เจอ
function updateUserId(userId) {
  console.log("[UI] updateUserId", userId);
  document.querySelectorAll(".userId")
    .forEach((el) => (el.textContent = userId));
}

function updateDisplayName(name) {
  console.log("[UI] updateDisplayName", name);
  document.querySelectorAll(".displayName")
    .forEach((el) => (el.textContent = name));
}

function updatePictureUrl(pictureUrl) {
  console.log("[UI] updatePictureUrl", pictureUrl);
  document.querySelectorAll(".picture")
    .forEach((img) => {
      img.src = pictureUrl;
      img.alt = "Profile Picture";
    });
}

// เมนู
const list = document.querySelectorAll(".list");

function activeLink() {
  console.log("[MENU] active", this);
  list.forEach((item) => item.classList.remove("active"));
  this.classList.add("active");
}
list.forEach((item) => item.addEventListener("click", activeLink));

// เรียก initialize หลังโหลด
window.onload = () => {
  console.log("[APP] window loaded");
  initializeLiff();
};

// --- SPA ---
async function loadPage(page) {
  console.log("[SPA] load page", page);

  try {
    // If the page is register, it's located at root. Otherwise, look in views folder.
    const pathPrefix = page === 'register' ? './' : './views/';
    const res = await fetch(pathPrefix + page + ".html");
    const html = await res.text();
    document.getElementById("app").innerHTML = html;

    if (liff.isLoggedIn()) {
      userProfile = await liff.getProfile();
      console.log("[SPA] refresh profile after load", userProfile.userId);
      updateUserId(userProfile.userId);
      updateDisplayName(userProfile.displayName);
      updatePictureUrl(userProfile.pictureUrl);
    }
  } catch (err) {
    console.error("[SPA] load error", err);
    document.getElementById("app").innerHTML = "<p>Error loading page.</p>";
  }
}

function syncActiveMenu(hash) {
  console.log("[MENU] sync active", hash);
  list.forEach((item) => {
    const a = item.querySelector("a");
    item.classList.toggle("active", a.getAttribute("href") === "#" + hash);
  });
}

function handleHashChange() {
  const hash = location.hash.replace("#", "") || "home";
  console.log("[ROUTER] hash change →", hash);

  // ❌ ยังไม่ลงทะเบียน แต่พยายามเข้าหน้าอื่น
  if (!isRegistered && hash !== "register") {
    console.warn("[ROUTER] blocked → force register");
    location.hash = "register";
    return;
  }

  const footer = document.querySelector(".footer-buttons");
  if (footer) {
    footer.style.display = hash === "register" ? "none" : "flex";
  }

  syncActiveMenu(hash);
  loadPage(hash);
}

window.addEventListener("hashchange", handleHashChange);

// --- 📝 ฟอร์มลงทะเบียน (ทำงานผ่าน SPA) ---
window.submitForm = async function(e) {
  e.preventDefault();

  if (!userProfile) {
    Swal.fire("ข้อผิดพลาด", "ไม่พบข้อมูล LINE ของคุณ กรุณาเปิดผ่าน LINE อีกครั้ง", "error");
    return;
  }

  const submitBtn = document.querySelector("button[type='submit']");
  submitBtn.disabled = true;
  submitBtn.textContent = "กำลังบันทึก...";
  submitBtn.style.backgroundColor = "#6c757d";

  const nameInput = document.getElementById("name");
  const phoneInput = document.getElementById("phone");
  const emailInput = document.getElementById("email");
  const addressInput = document.getElementById("address");

  let hasError = false;

  const showError = (input, message) => {
    const formControl = input.parentElement;
    formControl.classList.add("error");
    formControl.classList.remove("success");
    const small = formControl.querySelector("small");
    if(small) small.innerText = message;
  };

  const showSuccess = (input) => {
    const formControl = input.parentElement;
    formControl.classList.add("success");
    formControl.classList.remove("error");
  };

  if (nameInput.value.trim() === "") {
    showError(nameInput, "กรุณากรอกชื่อ-นามสกุล");
    hasError = true;
  } else { showSuccess(nameInput); }

  if (phoneInput.value.trim().length !== 10 || !/^\d{10}$/.test(phoneInput.value.trim())) {
    showError(phoneInput, "เบอร์โทรศัพท์ต้องมี 10 หลัก");
    hasError = true;
  } else { showSuccess(phoneInput); }

  if (emailInput.value.trim() === "") {
    showError(emailInput, "กรุณากรอกอีเมล");
    hasError = true;
  } else { showSuccess(emailInput); }

  if (addressInput.value.trim() === "") {
    showError(addressInput, "กรุณากรอกที่อยู่");
    hasError = true;
  } else { showSuccess(addressInput); }

  if (hasError) {
    submitBtn.disabled = false;
    submitBtn.textContent = "ลงทะเบียน";
    submitBtn.style.backgroundColor = "#275c27";
    return;
  }

  // แพ็กข้อมูล
  const payload = {
    action: "registerUser",
    data: {
      line_uid: userProfile.userId,
      line_name: userProfile.displayName,
      profile_image: userProfile.pictureUrl,
      name: nameInput.value,
      phone: phoneInput.value,
      email: emailInput.value,
      address: addressInput.value
    }
  };

  try {
    const res = await fetch(NETLIFY_FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    const result = await res.json();
    
    if (result.success) {
      isRegistered = true;
      Swal.fire("สำเร็จ!", "ลงทะเบียนเรียบร้อยแล้ว", "success").then(() => {
        // ลงทะเบียนเสร็จ พาไปยังหน้า Home
        window.location.hash = "home";
      });
    } else {
      throw new Error(result.message || "Unknown error");
    }
  } catch(err) {
    console.error(err);
    Swal.fire("ข้อผิดพลาด", "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่", "error");
    submitBtn.disabled = false;
    submitBtn.textContent = "ลงทะเบียน";
    submitBtn.style.backgroundColor = "#275c27";
  }
};
