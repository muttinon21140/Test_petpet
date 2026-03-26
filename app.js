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
    
    // ---- Page Specific Behaviors ----
    if (page === "pet-add") {
      setupPetAddPage();
    } else if (page === "home") {
      fetchAndDisplayPets();
    }

  } catch (err) {
    console.error("[SPA] load error", err);
    document.getElementById("app").innerHTML = "<p>Error loading page.</p>";
  }
}

// --- 🏠 จัดการหน้า Home ---
async function fetchAndDisplayPets() {
  if (!userProfile) return;
  const listEl = document.getElementById("home-pet-list");
  const countEl = document.getElementById("home-pet-count");
  if (!listEl) return;

  listEl.innerHTML = '<div style="text-align: center; color: #666; width: 100%; padding: 20px;">กำลังโหลดข้อมูล...</div>';

  try {
    const res = await fetch(`${NETLIFY_FUNCTION_URL}?action=getPets&userId=${encodeURIComponent(userProfile.userId)}`);
    const result = await res.json();
    
    if (result.success && result.data.length > 0) {
      if(countEl) countEl.textContent = result.data.length;
      
      listEl.innerHTML = "";
      result.data.forEach(pet => {
         const imgBg = pet.profile_image ? `url(${pet.profile_image})` : `url(https://via.placeholder.com/80x80/cccccc/ffffff?text=Pet)`;
         
         listEl.innerHTML += `
         <div class="pet-card">
          <div class="pet-info">
            <div class="pet-name">${pet.pet_name}</div>
            <div class="pet-species">${pet.pet_species || 'ไม่ระบุ'}</div>
            <button class="detail-button" onclick="location.hash='pet-detail?id=${pet.pet_id}'">ดูรายละเอียด →</button>
          </div>
          <div class="pet-image-container">
            <div class="pet-image" style="background-image: ${imgBg}; background-size: cover; background-position: center; border-radius: 40px;"></div>
          </div>
        </div>
         `;
      });
    } else {
      if(countEl) countEl.textContent = "0";
      listEl.innerHTML = '<div style="text-align: center; color: #666; width: 100%; padding: 20px;">ยังไม่มีสัตว์เลี้ยง ลองเพิ่มเลย!</div>';
    }
  } catch (err) {
    console.error(err);
    listEl.innerHTML = '<div style="text-align: center; color: red; width: 100%; padding: 20px;">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
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

// --- 🐾 ฟอร์มเพิ่มสัตว์เลี้ยง ---
function setupPetAddPage() {
  const actualFileInput = document.getElementById('actual-file-input');
  const placeholderImage = document.querySelector('.placeholder-image');
  const cameraIcon = document.querySelector('.camera-icon-large');
  const successIndicator = document.querySelector('.status-icon');
  
  let base64Image = "";

  if (actualFileInput) {
    actualFileInput.addEventListener('change', function () {
      const file = this.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
          base64Image = e.target.result; // เก็บรูปไว้เป็น base64 strings
          placeholderImage.src = base64Image;
          placeholderImage.style.display = 'block';
          cameraIcon.style.display = 'none';
          successIndicator.classList.add('visible');
        }
        reader.readAsDataURL(file);
      } else {
        base64Image = "";
        placeholderImage.src = '';
        placeholderImage.style.display = 'none';
        cameraIcon.style.display = 'block';
        successIndicator.classList.remove('visible');
      }
    });
  }

  // จัดการปุ่มย้อนกลับ
  const backBtn = document.querySelector('.back-button');
  if(backBtn) {
    backBtn.addEventListener('click', () => {
      window.history.back();
    });
  }

  // จัดการกดปุ่ม Submit เพื่อเพิ่มข้อมูลจริงผ่าน API
  const form = document.querySelector('.add-pet-form');
  if(form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (!userProfile) {
        Swal.fire("ข้อผิดพลาด", "ไม่พบข้อมูลผู้ใช้ของท่าน", "error");
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = "กำลังบันทึก...";
      submitBtn.style.backgroundColor = "#6c757d";

      // รวบรวมข้อมูลตามที่ฐานข้อมูลกำหนด (17 columns mapping)
      const payload = {
        action: "addPet",
        data: {
          user_id: userProfile.userId,
          pet_name: document.getElementById('pet-name').value,
          species: document.getElementById('pet-species').value,
          breed: document.getElementById('pet-breed').value,
          gender: document.getElementById('pet-gender').value,
          birth_date: document.getElementById('pet-birthday').value,
          age: document.getElementById('pet-age').value,
          status_sterilization: document.getElementById('pet-status_sterilization').value,
          pet_weight: document.getElementById('pet-weight').value,
          profile_image_url: base64Image
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
          Swal.fire("สำเร็จ!", "เพิ่มสัตว์เลี้ยงแล้ว", "success").then(() => {
            window.location.hash = "home"; // เด้งกลับหน้าโฮม
          });
        } else {
          throw new Error(result.message || "Unknown error");
        }
      } catch(err) {
        console.error(err);
        Swal.fire("ข้อผิดพลาด", "ไม่สามารถบันทึกข้อมูลได้", "error");
        submitBtn.disabled = false;
        submitBtn.textContent = "เพิ่มสัตว์เลี้ยง";
        submitBtn.style.backgroundColor = "#4caf50";
      }
    });
  }
}
