document.documentElement.classList.add("js");

// ===== PENGATURAN: ganti sesuai data acara =====
var WHATSAPP = "62XXXXXXXXXX";               // cadangan RSVP: nomor WhatsApp, format 62812xxxx (tanpa + atau 0)
var URL_DATA = "";                            // tempel URL Web App Google Apps Script (lihat apps-script/Code.gs)
var WAKTU_HITUNG = "2027-01-10T00:00:00+07:00";  // ganti ke jam akad kalau sudah ada
var JEDA_MUSIK = 2000;                        // milidetik: jeda sebelum musik kembali setelah lantunan selesai
var ACARA = {
  judul: "Pernikahan Uzairi & Samantha",
  tanggal: "20270110",                        // YYYYMMDD
  tanggalSelesai: "20270111",                 // hari berikutnya (acara sehari penuh)
  tempat: "Masjid Agung Gresik, Gresik, Jawa Timur",
  catatan: "Akad nikah Achmad Uzairi Rachman dan Shalia Samantha Inaray."
};

// 1. Nama tamu dari tautan, misalnya ...index.html#Budi-Santoso
function tampilkanNamaTamu() {
  var teks = window.location.hash.replace("#", "");
  var el = document.getElementById("nama-tamu");
  if (teks === "") { el.textContent = "Bapak/Ibu/Saudara/i"; return; }
  try { teks = decodeURIComponent(teks); } catch (e) { /* pakai apa adanya */ }
  el.textContent = teks.replace(/[-_+]/g, " ");
}
tampilkanNamaTamu();
window.addEventListener("hashchange", tampilkanNamaTamu);

// 2. Tombol Buka undangan
document.getElementById("tombol-buka").addEventListener("click", function () {
  document.body.classList.remove("terkunci");
  document.querySelector(".sampul").classList.add("terbuka");
  window.scrollTo(0, 0);
});

// 3. Hitung mundur
var targetWaktu = new Date(WAKTU_HITUNG).getTime();
function hitung() {
  var s = Math.floor(Math.max(0, targetWaktu - Date.now()) / 1000);
  document.getElementById("hari").textContent = Math.floor(s / 86400);
  document.getElementById("jam").textContent = Math.floor((s % 86400) / 3600);
  document.getElementById("menit").textContent = Math.floor((s % 3600) / 60);
  document.getElementById("detik").textContent = s % 60;
}
hitung();
setInterval(hitung, 1000);

// 4. Tambahkan ke kalender (.ics dan Google Calendar)
document.getElementById("tautan-google").href =
  "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent(ACARA.judul) +
  "&dates=" + ACARA.tanggal + "/" + ACARA.tanggalSelesai +
  "&location=" + encodeURIComponent(ACARA.tempat) + "&details=" + encodeURIComponent(ACARA.catatan);

document.getElementById("tombol-kalender").addEventListener("click", function () {
  var cap = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  var ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Undangan Pernikahan//ID", "BEGIN:VEVENT",
    "UID:" + ACARA.tanggal + "-undangan@pernikahan", "DTSTAMP:" + cap,
    "DTSTART;VALUE=DATE:" + ACARA.tanggal, "DTEND;VALUE=DATE:" + ACARA.tanggalSelesai,
    "SUMMARY:" + ACARA.judul, "LOCATION:" + ACARA.tempat, "DESCRIPTION:" + ACARA.catatan,
    "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  var tautan = document.createElement("a");
  tautan.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  tautan.download = "undangan-pernikahan.ics";
  document.body.appendChild(tautan);
  tautan.click();
  document.body.removeChild(tautan);
});

// 5. Tanda kasih: pilih bank, rincian muncul sesuai pilihan, tombol salin
var tombolPilih = document.querySelectorAll(".pilih");
var rJudul = document.getElementById("rinci-judul");
var rIsi = document.getElementById("rinci-isi");
var rKet = document.getElementById("rinci-ket");
var tombolSalin = document.getElementById("tombol-salin");
function labelSalin() { return tombolSalin.getAttribute("data-label") || "Salin"; }
function pilihRekening(tombol) {
  tombolPilih.forEach(function (b) { b.setAttribute("aria-pressed", String(b === tombol)); });
  rJudul.textContent = tombol.getAttribute("data-judul");
  rIsi.textContent = tombol.getAttribute("data-isi");
  var adaAlamat = tombol.hasAttribute("data-alamat");
rIsi.classList.toggle("alamat", adaAlamat);
rIsi.classList.toggle("nomor", !adaAlamat);
  rKet.textContent = tombol.getAttribute("data-ket");
  tombolSalin.setAttribute("data-label", tombol.getAttribute("data-salin") || "Salin nomor");
  tombolSalin.textContent = labelSalin();
}
tombolPilih.forEach(function (b) { b.addEventListener("click", function () { pilihRekening(b); }); });
if (tombolPilih.length) pilihRekening(tombolPilih[0]);
tombolSalin.addEventListener("click", function () {
  var teks = rIsi.textContent.trim();
  function selesai() { tombolSalin.textContent = "Tersalin"; setTimeout(function () { tombolSalin.textContent = labelSalin(); }, 1800); }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(teks).then(selesai, function () { window.prompt("Salin teks ini:", teks); });
  } else { window.prompt("Salin teks ini:", teks); }
});

// 6. RSVP dan ucapan: disimpan ke Google Sheets (lewat Apps Script), ucapan tampil di undangan
var formRsvp = document.getElementById("rsvp");
var pesan = document.getElementById("pesan");
var daftarUcapan = document.getElementById("daftar-ucapan");

function waktuLalu(ms) {
  var d = Math.max(0, Date.now() - ms) / 1000;
  if (d < 60) return "baru saja";
  if (d < 3600) return Math.floor(d / 60) + " menit lalu";
  if (d < 86400) return Math.floor(d / 3600) + " jam lalu";
  return Math.floor(d / 86400) + " hari lalu";
}
function buatUcapan(item) {
  var li = document.createElement("li");
  var n = document.createElement("b"); n.textContent = item.nama;       // textContent: aman dari kode berbahaya
  var p = document.createElement("p"); p.textContent = item.ucapan;
  var w = document.createElement("small"); w.textContent = waktuLalu(item.waktu);
  li.appendChild(n); li.appendChild(p); li.appendChild(w);
  return li;
}
function tampilkanUcapan(daftar) {
  daftarUcapan.textContent = "";
  if (!daftar.length) {
    var kosong = document.createElement("li"); kosong.className = "kosong";
    kosong.textContent = "Belum ada ucapan. Jadilah yang pertama.";
    daftarUcapan.appendChild(kosong); return;
  }
  daftar.forEach(function (item) { daftarUcapan.appendChild(buatUcapan(item)); });
}
function muatUcapan() {
  if (!URL_DATA) { document.getElementById("kotak-ucapan").hidden = true; return; }
  fetch(URL_DATA + (URL_DATA.indexOf("?") > -1 ? "&" : "?") + "t=" + Date.now())
    .then(function (r) { return r.json(); })
    .then(tampilkanUcapan)
    .catch(function () {
      daftarUcapan.textContent = "";
      var gagal = document.createElement("li"); gagal.className = "kosong";
      gagal.textContent = "Ucapan belum dapat dimuat."; daftarUcapan.appendChild(gagal);
    });
}
muatUcapan();

formRsvp.addEventListener("submit", function (e) {
  e.preventDefault();
  var nama = document.getElementById("f-nama").value.trim();
  var ucapan = document.getElementById("f-ucapan").value.trim();
  var hadir = document.querySelector("input[name=hadir]:checked").value;
  var jumlah = document.getElementById("f-jumlah").value;
  if (nama === "") { pesan.textContent = "Mohon isi nama Anda."; document.getElementById("f-nama").focus(); return; }
  if (document.getElementById("f-jebakan").value) return;                // diisi bot: abaikan

  if (!URL_DATA) {                                                       // cadangan: kirim lewat WhatsApp
    if (/X/i.test(WHATSAPP)) { pesan.textContent = "Penyimpanan data belum diatur."; return; }
    var teks = "Assalamu’alaikum. Saya " + nama + (hadir === "hadir" ? " insya Allah hadir (" + jumlah + " orang)." : " mohon maaf belum bisa hadir.");
    if (ucapan) teks += "\n\nUcapan: " + ucapan;
    window.open("https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(teks), "_blank", "noopener");
    return;
  }

  var tombol = formRsvp.querySelector("button[type=submit]");
  tombol.disabled = true; pesan.textContent = "Mengirim…";
  var data = new URLSearchParams();
  data.append("nama", nama); data.append("hadir", hadir); data.append("jumlah", jumlah);
  data.append("ucapan", ucapan); data.append("website", document.getElementById("f-jebakan").value);
  fetch(URL_DATA, { method: "POST", mode: "no-cors", body: data })
    .then(function () {
      pesan.textContent = "Terima kasih, konfirmasi Anda sudah tercatat.";
      formRsvp.reset();
      if (ucapan) {
        if (daftarUcapan.firstChild && daftarUcapan.firstChild.className === "kosong") daftarUcapan.textContent = "";
        daftarUcapan.insertBefore(buatUcapan({ nama: nama, ucapan: ucapan, waktu: Date.now() }), daftarUcapan.firstChild);
      }
      setTimeout(muatUcapan, 2500);
      setTimeout(function () { tombol.disabled = false; }, 4000);
    })
    .catch(function () { pesan.textContent = "Belum terkirim. Periksa sambungan internet lalu coba lagi."; tombol.disabled = false; });
});

// 7. Animasi muncul saat digulir
var targetReveal = document.querySelectorAll("main .isi > *:not(.kata)");
targetReveal.forEach(function (el, i) { el.classList.add("reveal"); el.style.transitionDelay = (i % 4) * 0.12 + "s"; });
if ("IntersectionObserver" in window) {
  var amat = new IntersectionObserver(function (daftar) {
    daftar.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add("tampak"); amat.unobserve(x.target); } });
  }, { threshold: 0.1, rootMargin: "0px 0px -8% 0px" });
  targetReveal.forEach(function (el) { amat.observe(el); });
} else { targetReveal.forEach(function (el) { el.classList.add("tampak"); }); }

// 8. Foto yang belum ada: bingkai mempelai menampilkan "foto"; foto pembatas disembunyikan
document.querySelectorAll(".bingkai .foto img").forEach(function (img) {
  function kosong() { img.parentNode.classList.add("kosong"); }
  img.addEventListener("error", kosong);
  img.addEventListener("load", function () { img.parentNode.classList.remove("kosong"); });
  if (img.complete && img.naturalWidth === 0) kosong();
});

document.querySelectorAll(".pita-foto img,.penutup-foto img").forEach(function (img) {
  function sembunyi() { img.parentNode.hidden = true; }
  img.addEventListener("error", sembunyi);
  if (img.complete && img.naturalWidth === 0) sembunyi();
});

// 9. Musik latar: mulai saat Buka undangan ditekan, tombol bisu/nyala
var musik = document.getElementById("musik");
var tombolMusik = document.getElementById("tombol-musik");
function sinkronMusik() {
  var bisu = musik.muted || musik.paused;
  tombolMusik.setAttribute("aria-pressed", String(bisu));
  tombolMusik.setAttribute("aria-label", bisu ? "Nyalakan musik" : "Matikan musik");
}
document.getElementById("tombol-buka").addEventListener("click", function () {
  tombolMusik.hidden = false;
  var janji = musik.play();
  if (janji && janji.catch) janji.catch(sinkronMusik);
  sinkronMusik();
});
tombolMusik.addEventListener("click", function () {
  if (musik.paused) { musik.muted = false; var j = musik.play(); if (j && j.catch) j.catch(function () {}); }
  else { musik.muted = !musik.muted; }
  sinkronMusik();
});
musik.addEventListener("play", sinkronMusik);
musik.addEventListener("pause", sinkronMusik);
musik.addEventListener("error", function () { tombolMusik.hidden = true; });   // file lagu belum ada
document.addEventListener("visibilitychange", function () {                   // hemat baterai: jeda saat tab disembunyikan
  if (document.hidden) { if (!musik.paused) { musik.pause(); musik.setAttribute("data-jeda", "1"); } }
  else if (musik.getAttribute("data-jeda") === "1") { musik.removeAttribute("data-jeda"); var p = musik.play(); if (p && p.catch) p.catch(function () {}); }
});

// 10. Lantunan di halaman ayat: musik latar terjeda selama lantunan, kembali 2 detik setelah selesai
var lantunan = document.getElementById("lantunan");
var tombolLantunan = document.getElementById("tombol-lantunan");
var lantunanAktif = false, musikHarusKembali = false, jedaMusik = null;
function labelLantunan() {
  var main = !lantunan.paused;
  tombolLantunan.textContent = main ? "Jeda lantunan" : "Dengarkan lantunan";
  tombolLantunan.setAttribute("aria-pressed", String(main));
}
function lantunanMulai() {
  if (lantunanAktif) return;
  lantunanAktif = true;
  clearTimeout(jedaMusik);                             // batalkan jadwal musik kembali bila ada
  if (!musik.paused) { musikHarusKembali = true; musik.pause(); }   // musik sedang berbunyi: ingat untuk dilanjutkan
  tombolMusik.disabled = true;                         // tombol musik dikunci selama lantunan
  labelLantunan();
}
function lantunanSelesai() {
  if (!lantunanAktif) return;
  lantunanAktif = false;
  labelLantunan();
  if (!musikHarusKembali) { tombolMusik.disabled = false; return; }
  jedaMusik = setTimeout(function () {
    tombolMusik.disabled = false;
    musikHarusKembali = false;
    var j = musik.play(); if (j && j.catch) j.catch(function () {});
  }, JEDA_MUSIK);
}
lantunan.addEventListener("play", lantunanMulai);
lantunan.addEventListener("pause", lantunanSelesai);   // dijeda tamu
lantunan.addEventListener("ended", lantunanSelesai);   // selesai sendiri
lantunan.addEventListener("error", function () { lantunanSelesai(); tombolLantunan.hidden = true; });  // file belum ada
tombolLantunan.addEventListener("click", function () {
  if (lantunan.paused) {
    var j = lantunan.play();
    if (j && j.catch) j.catch(function () { lantunanSelesai(); });
  } else { lantunan.pause(); }
});
labelLantunan();
