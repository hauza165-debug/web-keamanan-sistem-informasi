const SUPABASE_URL = "https://espisnaefzoinivsrabc.supabase.co"; 
const SUPABASE_KEY = "sb_publishable_QEHg3MvED_qomoiYzTcLTA_5M4xGnrY";
const sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let loggedInUser = "";
let currentSelectedFile = null;

function fillDemoAccount() {
    document.getElementById('authUsername').value = "hauzatul_aina";
    document.getElementById('authPassword').value = "bebas123";
    document.getElementById('authSystemToken').value = "UAS-RAHASIA-2026";
}

function toggleTokenModal() {
    const box = document.getElementById('token-display-box');
    box.style.display = (box.style.display === 'none') ? 'flex' : 'none';
}

function copyTokenToClipboard() {
    const tokenText = document.getElementById('system-token-text').innerText;
    navigator.clipboard.writeText(tokenText).then(() => {
        alert("⭐ Token '" + tokenText + "' berhasil disalin ke papan klip!");
    });
}

function validateTripleAuth() {
    const usernameInput = document.getElementById('authUsername').value.trim();
    const passwordInput = document.getElementById('authPassword').value.trim();
    const tokenInput = document.getElementById('authSystemToken').value.trim();
    const errorElement = document.getElementById('auth-error-msg');

    if (!usernameInput || !passwordInput || !tokenInput) {
        errorElement.innerText = "Semua kolom wajib terisi!";
        errorElement.style.display = "block";
        return;
    }

    if (tokenInput !== "UAS-RAHASIA-2026") {
        errorElement.innerText = "Token Sistem tidak valid! Hak masuk ditolak.";
        errorElement.style.display = "block";
        return;
    }

    loggedInUser = usernameInput;
    errorElement.style.display = "none";
    
    document.getElementById('auth-page').style.display = 'none';
    document.getElementById('main-dashboard').style.display = 'flex';
    
    document.getElementById('dashboardDisplayUsername').innerText = loggedInUser;
    document.getElementById('profileUsername').value = loggedInUser;
    document.getElementById('avatarLetter').innerText = loggedInUser.charAt(0).toUpperCase();
    document.getElementById('user-session-node').innerText = `Enklave Aktif: @${loggedInUser}`;
    
    switchTab('dashboard');
}

function toggleMobileMenu() {
    document.getElementById('sidebar-panel').classList.toggle('open');
    document.getElementById('sidebar-overlay').classList.toggle('open');
}

function encryptAndUpload() {
    const fileInput = document.getElementById('fileInput');
    const secretKey = document.getElementById('secretKey').value;
    const uploadBtn = document.getElementById('uploadBtn');
    const statusDiv = document.getElementById('uploadStatus');

    if (fileInput.files.length === 0 || !secretKey) {
        alert("Pilih file dan tentukan Password AES!");
        return;
    }

    const file = fileInput.files[0];
    uploadBtn.disabled = true;
    statusDiv.style.display = "block";
    statusDiv.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Menjalankan enkripsi enklaf AES-256...";

    const reader = new FileReader();
    reader.onload = async function(e) {
        const rawData = e.target.result; 
        
        const encryptedData = CryptoJS.AES.encrypt(rawData, secretKey).toString();
        const blob = new Blob([encryptedData], {type: "text/plain"});
        
        const encryptedFileName = Date.now() + "_" + file.name + ".enc";
        statusDiv.innerHTML = "<i class='fa-solid fa-cloud-arrow-up'></i> Menstransfer bit biner ke Storage Cloud...";

        const { error: storageError } = await sbClient.storage
            .from('web_keamanan')
            .upload(encryptedFileName, blob);

        if (storageError) {
            alert("Storage Error: " + storageError.message);
            resetUploadUI();
            return;
        }

        statusDiv.innerHTML = "<i class='fa-solid fa-database'></i> Mengunci metadata hak akses pengguna...";
        const generatedToken = "TOK-" + Math.floor(100000 + Math.random() * 900000);

        const { error: dbError } = await sbClient
            .from('file_metadata')
            .insert([{ 
                file_name: file.name, 
                storage_path: encryptedFileName, 
                access_token: generatedToken,
                username: loggedInUser 
            }]);

        if (dbError) {
            alert("Database Error: " + dbError.message);
        } else {
            statusDiv.innerHTML = `<div class='alert-success-box'>
                <strong><i class='fa-solid fa-circle-check'></i> Proteksi Berhasil Terisolasi!</strong><br>
                Token Berkas Baru Anda: <code>${generatedToken}</code><br>
                <small>Hanya dapat diakses oleh akun aktif Anda.</small>
            </div>`;
            fileInput.value = '';
            document.getElementById('secretKey').value = '';
        }
        uploadBtn.disabled = false;
    };
    reader.readAsDataURL(file); 
}

function downloadAndDecrypt() {
    const inputToken = document.getElementById('inputAccessToken').value.trim();
    const secretKey = document.getElementById('decryptSecretKey').value;

    if (!currentSelectedFile) {
        alert("Pilih file terlebih dahulu di menu My Files!");
        return;
    }
    if (!inputToken || !secretKey) {
        alert("Isi token database dan sandi dekripsi AES!");
        return;
    }

    if (inputToken !== currentSelectedFile.access_token) {
        alert("Akses Ditolak! Sinkronisasi metadata gagal.");
        return;
    }

    const { data: urlData } = sbClient.storage.from('web_keamanan').getPublicUrl(currentSelectedFile.storage_path);

    fetch(urlData.publicUrl)
        .then(res => res.text())
        .then(ciphertext => {
            try {
                const decrypted = CryptoJS.AES.decrypt(ciphertext, secretKey);
                const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);
                if (!decryptedStr || !decryptedStr.includes("data:")) throw new Error();
                fetch(decryptedStr)
                    .then(res => res.blob())
                    .then(blob => {
                        const link = document.createElement("a");
                        link.href = URL.createObjectURL(blob);
                        link.download = currentSelectedFile.file_name;
                        link.click();
                        alert("Validasi Sukses & File Anda Berhasil Didekripsi!");
                        document.getElementById('inputAccessToken').value = "";
                        document.getElementById('decryptSecretKey').value = "";
                    });
            } catch (e) {
                alert("Token Valid, namun Kunci AES Salah atau File Korup!");
            }
        }).catch(() => alert("Gagal mengambil berkas dari storage."));
}

async function fetchFileList() {
    const fileTable = document.getElementById('myFilesTableBody');
    const logBody = document.getElementById('logTableBody');
    const totalStat = document.getElementById('stat-total-files');
    
    const { data, error } = await sbClient
        .from('file_metadata')
        .select('*')
        .eq('username', loggedInUser)
        .order('uploaded_at', { ascending: false });

    if (error) {
        fileTable.innerHTML = `<tr><td colspan="3">Gagal sinkronisasi awan.</td></tr>`;
        return;
    }

    totalStat.innerText = data.length;
    fileTable.innerHTML = "";
    logBody.innerHTML = "";

    if (data.length === 0) {
        fileTable.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#ffb3c1;">Belum ada berkas terproteksi milik Anda.</td></tr>`;
        logBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#ffb3c1;">Riwayat log kosong.</td></tr>`;
        return;
    }

    data.forEach(item => {
        const trFile = document.createElement('tr');
        trFile.innerHTML = `
            <td>
                <div style="display:flex; align-items:center; gap:10px; text-align:left;">
                    <i class="fa-solid fa-file-shield" style="color:#ffb3c1; font-size:16px;"></i>
                    <div><strong>${item.file_name}</strong><br><small style="color:#ffb3c1; opacity:0.8;">Jalur Akun: @${item.username}</small></div>
                </div>
            </td>
            <td><span class="badge-status">AES SECURE</span></td>
            <td>
                <button class="btn-copy" title="Proses Dekripsi" onclick="selectForDecrypt('${item.id}')"><i class="fa-solid fa-unlock"></i> Eksekusi</button>
            </td>
        `;
        fileTable.appendChild(trFile);

        const trLog = document.createElement('tr');
        const jam = new Date(item.uploaded_at).toLocaleTimeString('id-ID');
        trLog.innerHTML = `
            <td>${jam}</td>
            <td><span style="color:#ffb3c1; font-weight:700;">COMMIT (UPLOAD)</span></td>
            <td>Token ${item.access_token} locked inside secure node space for @${item.username}</td>
        `;
        logBody.appendChild(trLog);
    });
}

async function selectForDecrypt(id) {
    const { data } = await sbClient.from('file_metadata').select('*').eq('id', id).single();
    if(data) {
        currentSelectedFile = data;
        document.getElementById('selectedFileName').innerText = data.file_name;
        document.getElementById('inputAccessToken').value = data.access_token;
        switchTab('token');
    }
}

function resetUploadUI() {
    document.getElementById('uploadBtn').disabled = false;
    document.getElementById('uploadStatus').style.display = "none";
}

function switchTab(tabId) {
    const tabs = ['dashboard', 'myfiles', 'upload', 'token', 'logs', 'profile'];
    tabs.forEach(t => {
        document.getElementById('tab-' + t).style.display = (t === tabId) ? 'block' : 'none';
        document.getElementById('menu-' + t).className = (t === tabId) ? 'active' : '';
    });
    
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar-panel').classList.remove('open');
        document.getElementById('sidebar-overlay').classList.remove('open');
    }

    if(tabId === 'myfiles' || tabId === 'dashboard' || tabId === 'logs') {
        fetchFileList();
    }
}

function logout() {
    loggedInUser = "";
    document.getElementById('main-dashboard').style.display = 'none';
    document.getElementById('auth-page').style.display = 'flex';
    document.getElementById('authUsername').value = '';
    document.getElementById('authPassword').value = '';
    document.getElementById('authSystemToken').value = '';
}
