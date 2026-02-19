const scriptURL = 'https://script.google.com/macros/s/AKfycbxIvVSTo3yYVEFm_BxndcHdfOmHScYJLjq7oWbfnWYv8kqmmX0kJvM2Wu3dwm9hPLDt/exec';
let jawaban = {};
let isSigned = false; 
let currentToken = ""; 

// 1. FUNGSI TANDA TANGAN
function initSignature() {
    const canvas = document.getElementById('signature-pad');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let drawing = false;

    canvas.width = canvas.offsetWidth;
    canvas.height = 150;
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";

    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left,
            y: (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top
        };
    }

    function start(e) { drawing = true; isSigned = true; const pos = getPos(e); ctx.beginPath(); ctx.moveTo(pos.x, pos.y); }
    function move(e) { if (!drawing) return; const pos = getPos(e); ctx.lineTo(pos.x, pos.y); ctx.stroke(); e.preventDefault(); }
    function stop() { drawing = false; }

    canvas.addEventListener("mousedown", start);
    canvas.addEventListener("mousemove", move);
    window.addEventListener("mouseup", stop);
    canvas.addEventListener("touchstart", start, {passive: false});
    canvas.addEventListener("touchmove", move, {passive: false});
    canvas.addEventListener("touchend", stop);
}

function clearSignature() {
    const canvas = document.getElementById('signature-pad');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    isSigned = false;
}

function cariNama() {
    const nrpBox = document.getElementById("nrp");
    const namaInput = document.getElementById("nama");
    
    // Ambil value dan pastikan jadi string
    const nrpInput = nrpBox.value.trim();

    console.log("Mencari NRP:", nrpInput); // Cek di F12 Console

    if (typeof daftarKaryawan !== 'undefined') {
        if (daftarKaryawan[nrpInput]) {
            namaInput.value = daftarKaryawan[nrpInput];
            console.log("Ketemu:", daftarKaryawan[nrpInput]);
        } else {
            namaInput.value = "";
            console.log("NRP tidak terdaftar di database.");
        }
    } else {
        console.error("Variabel daftarKaryawan belum dimuat!");
    }
}

// 2. FUNGSI LOAD & RENDER SOAL (PENTING UNTUK DRAFT)
function loadSoal() {
    const unit = document.getElementById("unit").value;
    const container = document.getElementById("soalContainer");
    container.innerHTML = "";

    if (!unit || !bankSoal[unit]) return;

    bankSoal[unit].forEach(s => {
        const key = `${s.tipe}|${s.uk}|${s.soal}`;
        const d = jawaban[key] || {}; 

        container.innerHTML += `
            <div class="soal" data-key="${key}">
                <p>${s.text}</p>
                <div class="button-group">
                    <button type="button" class="btn-ya ${d.nilai == 1 ? 'active' : ''}" onclick="jawab(this, 1)">YA</button>
                    <button type="button" class="btn-tidak ${d.nilai == 0 ? 'active' : ''}" onclick="jawab(this, 0)">TIDAK</button>
                    <button type="button" class="btn-tdk-uji ${d.nilai == -1 ? 'active' : ''}" onclick="jawab(this, -1)">TIDAK DIUJI</button>
                </div>
                <div class="followup">
                    ${renderFollowUp(key, d)}
                </div>
            </div>`;
    });
}

function renderFollowUp(key, d) {
    if (d.nilai == 0) { 
        return `
            <div class="followup-content">
                <p><b>OFR (On-Field Refreshment):</b></p>
                <div class="button-group-ofr">
                    <button type="button" class="btn-ofr-ya ${d.ofr == 1 ? 'active' : ''}" onclick="jawabOFR(this, '${key}', 1)">YA</button>
                    <button type="button" class="btn-ofr-tidak ${d.ofr == 0 ? 'active' : ''}" onclick="jawabOFR(this, '${key}', 0)">TIDAK</button>
                </div>
            </div>`;
    } else if (d.nilai == -1) { 
        return `
            <div class="followup-content">
                <p><b>Alasan Tidak Diuji:</b></p>
                <input type="text" value="${d.alasan || ''}" placeholder="Tulis alasan..." oninput="updateAlasan('${key}', this.value)">
            </div>`;
    }
    return ""; 
}

// 3. LOGIKA BUTTON KLIK
function jawab(btn, nilai) {
    const div = btn.closest(".soal");
    const follow = div.querySelector(".followup");
    const key = div.dataset.key;

    // Cek apakah tombol ini sudah aktif sebelumnya (Klik kedua kali)
    if (btn.classList.contains("active")) {
        // 1. Hapus dari variabel jawaban
        delete jawaban[key];

        // 2. Hapus class active dari semua tombol di grup itu
        const groupUtama = div.querySelector(".button-group");
        groupUtama.querySelectorAll("button").forEach(b => b.classList.remove("active"));

        // 3. Kosongkan area followup (OFR/Alasan)
        follow.innerHTML = "";
        return; // Berhenti di sini (Toggle Off)
    }

    // --- Jika Klik Pertama Kali (Toggle On) ---
    
    // 1. Simpan Jawaban
    jawaban[key] = { nilai: nilai };

    // 2. Reset warna tombol lain dalam satu grup
    const groupUtama = div.querySelector(".button-group");
    groupUtama.querySelectorAll("button").forEach(b => b.classList.remove("active"));
    
    // 3. Aktifkan tombol yang diklik
    btn.classList.add("active");

    // 4. Render Follow Up (OFR atau Alasan)
    follow.innerHTML = renderFollowUp(key, jawaban[key]);
}

function jawabOFR(btn, key, nilai) {
    if (!jawaban[key]) return;

    if (btn.classList.contains("active")) {
        // Jika diklik lagi, hapus status OFR-nya saja
        delete jawaban[key].ofr;
        btn.classList.remove("active");
    } else {
        // Jika klik baru, aktifkan
        jawaban[key].ofr = nilai;
        const container = btn.parentElement;
        container.querySelectorAll("button").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
    }
}

function updateAlasan(key, text) {
    if (jawaban[key]) jawaban[key].alasan = text;
}

// 4. CARI DRAFT
function cariDraft() {
    const tokenInput = document.getElementById("tokenInput");
    const token = tokenInput.value.toUpperCase().trim();
    const btnCari = document.getElementById("btnCari");

    if (!token) return alert("Masukkan kode token!");

    btnCari.innerHTML = '<i class="fa fa-spinner fa-spin"></i> MENCARI...';
    btnCari.disabled = true;

    fetch(`${scriptURL}?token=${token}`)
    .then(res => res.json())
    .then(res => {
        if (res.status === "success") {
            const d = res.data;
            currentToken = token;

            document.getElementById("nrp").value = d.nrp || "";
            document.getElementById("nama").value = d.nama || "";
            document.getElementById("unit").value = d.unit || ""; 
            document.getElementById("No_Unit").value = d.no_unit || "";
            document.getElementById("Evaluator").value = d.evaluator || "";
            document.getElementById("Tanggal_evaluasi").value = d.tanggal || "";
            document.getElementById("EGI").value = d.EGI || "";

            jawaban = {}; 
            if (d.hasil_jawaban) {
                d.hasil_jawaban.forEach(item => {
                    jawaban[item.soal_id] = item.data;
                });
            }

            setTimeout(() => {
                loadSoal(); 
                alert("Draft Ditemukan! Silakan periksa kembali jawaban.");
            }, 300); 

        } else {
            alert("Token tidak ditemukan.");
        }
    })
    .catch(err => alert("Gagal mengambil data draf."))
    .finally(() => {
        btnCari.innerHTML = "CARI DRAFT";
        btnCari.disabled = false;
    });
}

// 5. SIMPAN & KIRIM
function simpanDraft(btnDraft) {
    const nrp = document.getElementById("nrp").value;
    const no_unit = document.getElementById("No_Unit").value;
    if (!nrp || !no_unit) return alert("NRP dan No Unit wajib diisi!");

    const data = {
        status: "DRAFT",
        token: currentToken,
        nama: document.getElementById("nama").value,
        nrp: nrp,
        unit: document.getElementById("unit").value,
        no_unit: no_unit,
        evaluator: document.getElementById("Evaluator").value,
        tanggal: document.getElementById("Tanggal_evaluasi").value,
        EGI: document.getElementById("EGI").value,
        hasil_jawaban: Object.keys(jawaban).map(key => ({
            soal_id: key,
            data: jawaban[key]
        }))
    };

    btnDraft.innerText = "MENYIMPAN...";
    btnDraft.disabled = true;

    fetch(scriptURL, {
        method: "POST",
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(res => {
        if(res.status === "success") {
            currentToken = res.token; 
            alert("Draft Tersimpan! Token: " + res.token);
            location.reload();
        }
    })
    .finally(() => {
        btnDraft.innerText = "SIMPAN DRAFT";
        btnDraft.disabled = false;
    });
}

function kirimFinal() {
    // 1. Validasi awal
    if (!isSigned) return alert("Wajib tanda tangan sebelum kirim!");
    
    const btn = document.getElementById("btnKirimFinal");
    const ttdBase64 = document.getElementById('signature-pad').toDataURL();
    
    // Ambil token: utamakan dari input, jika kosong pakai variabel global
    const tokenInputVal = document.getElementById("tokenInput") ? document.getElementById("tokenInput").value.toUpperCase() : "";
    const tokenYangDigunakan = tokenInputVal || currentToken;

    // 2. HITUNG NILAI HASIL TERLEBIH DAHULU (PENTING!)
    // Pastikan variabel ini dihitung DI ATAS sebelum membuat objek 'data'
    let ya = Object.values(jawaban).filter(j => j.nilai === 1).length;
    let tidak = Object.values(jawaban).filter(j => j.nilai === 0).length;
    let nilaiHasil = (ya + tidak) > 0 ? Math.round((ya / (ya + tidak)) * 100) : 0;

    // 3. BARU BUAT OBJEK DATA
    const data = {
        status: "FINAL",
        token: tokenYangDigunakan,
        tanda_tangan: ttdBase64,
        nama: document.getElementById("nama").value,
        nrp: document.getElementById("nrp").value,
        unit: document.getElementById("unit").value,
        no_unit: document.getElementById("No_Unit").value,
        evaluator: document.getElementById("Evaluator").value,
        tanggal: document.getElementById("Tanggal_evaluasi").value,
        EGI: document.getElementById("EGI").value,
        nilai_akhir: nilaiHasil, // Sekarang nilaiHasil sudah aman karena sudah dihitung di atas
        hasil_jawaban: Object.keys(jawaban).map(key => ({ 
            soal_id: key, 
            data: jawaban[key] 
        }))
    };

    // 4. Proses Pengiriman
    btn.innerText = "MENGIRIM...";
    btn.disabled = true;

fetch(scriptURL, {
        method: "POST",
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(res => {
        if(res.status === "success"){
            // Pesan sukses tanpa menampilkan token
            alert("Evaluasi Selesai! Data telah berhasil dikirim ke database.");
            location.reload(); // Form reset, token otomatis "hilang" dari memory
        } else {
            alert("Gagal: " + res.message);
            btn.innerText = "SUBMIT FINAL";
            btn.disabled = false;
        }
    })

    .catch(err => {
        console.error("Error submit:", err);
        alert("Gagal mengirim data. Cek koneksi internet atau script URL.");
        btn.innerText = "SUBMIT FINAL";
        btn.disabled = false;
    });
}

function submitForm() {
    // Validasi: Cek apakah sudah ada jawaban
    if (Object.keys(jawaban).length === 0) {
        alert("Harap isi evaluasi terlebih dahulu sebelum submit!");
        return;
    }
    
    // Validasi: Cek apakah Unit dan Nama sudah terisi
    const nama = document.getElementById("nama").value;
    const unit = document.getElementById("unit").value;
    if (!nama || !unit) {
        alert("NRP/Nama dan Unit wajib diisi!");
        return;
    }

    tampilkanSummary();
}

// 6. MODAL SUMMARY
function tampilkanSummary() {
    try {
        let ya = 0, tidak = 0, tdkUji = 0;
        const unitTerpilih = document.getElementById("unit").value;
        const listSoal = (typeof bankSoal !== 'undefined') ? (bankSoal[unitTerpilih] || []) : [];
        
        // Hitung jawaban dari variabel global 'jawaban'
        Object.values(jawaban).forEach(j => {
            if (j.nilai === 1) ya++;
            else if (j.nilai === 0) tidak++;
            else if (j.nilai === -1) tdkUji++;
        });

        const totalSoal = listSoal.length;
        const belumDijawab = totalSoal - (ya + tidak + tdkUji);
        const nilaiAkhir = (ya + tidak > 0) ? Math.round((ya / (totalSoal-tdkUji)) * 100) : 0;

        // Isi ke elemen Modal
        document.getElementById("sumTotal").innerText = totalSoal;
        document.getElementById("sumYa").innerText = ya;
        document.getElementById("sumTidak").innerText = tidak;
        document.getElementById("sumTdkUji").innerText = tdkUji;
        document.getElementById("sumBelum").innerText = belumDijawab;
        document.getElementById("sumNilai").innerText = nilaiAkhir + " / 100";

        // Munculkan Modal
        document.getElementById("modalOverlay").style.display = "block";
        document.getElementById("summaryBox").style.display = "block";

        // Inisialisasi Tanda Tangan
        setTimeout(initSignature, 300);

    } catch (e) {
        console.error(e);
        alert("Gagal memproses ringkasan: " + e.message);
    }
}

function closeSummary() {
    document.getElementById("modalOverlay").style.display = "none";
    document.getElementById("summaryBox").style.display = "none";
}

window.onload = function() {
    initSignature();
};
