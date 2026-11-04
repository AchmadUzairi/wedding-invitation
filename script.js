document.documentElement.classList.add("js");

// ===== PENGATURAN: ganti sesuai data acara =====
var WHATSAPP = "62XXXXXXXXXX";               // nomor WhatsApp penerima RSVP, format 62812xxxx (tanpa + atau 0)
var ACARA = {
  judul: "Pernikahan Uzairi & Shalia",
  tanggal: "20270110",                        // YYYYMMDD
  tanggalSelesai: "20270111",                 // hari berikutnya (acara sehari penuh)
  tempat: "Masjid Agung Gresik, Gresik, Jawa Timur",
  catatan: "Akad nikah Achmad Uzairi Rachman dan Shalia Samanta Inaray."
};
var WAKTU_HITUNG = "2027-01-10T00:00:00+07:00";  // ganti ke jam akad kalau sudah ada

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
var target = new Date(WAKTU_HITUNG).getTime();
function hitung() {
  var s = Math.floor(Math.max(0, target - Date.now()) / 1000);
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

// 5. Tombol salin (nomor rekening dan alamat)
document.querySelectorAll("[data-salin]").forEach(function (tombol) {
  tombol.addEventListener("click", function () {
    var teks = document.querySelector(tombol.getAttribute("data-salin")).textContent.trim();
    var awal = tombol.textContent;
    function selesai() { tombol.textContent = "Tersalin"; setTimeout(function () { tombol.textContent = awal; }, 1800); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(teks).then(selesai, function () { window.prompt("Salin teks ini:", teks); });
    } else { window.prompt("Salin teks ini:", teks); }
  });
});

// 6. RSVP dan ucapan: dikirim lewat WhatsApp
document.getElementById("rsvp").addEventListener("submit", function (e) {
  e.preventDefault();
  var pesan = document.getElementById("pesan");
  var nama = document.getElementById("f-nama").value.trim();
  if (nama === "") { pesan.textContent = "Mohon isi nama Anda."; document.getElementById("f-nama").focus(); return; }
  if (/X/i.test(WHATSAPP)) { pesan.textContent = "Nomor WhatsApp penerima belum diatur."; return; }
  var hadir = document.querySelector("input[name=hadir]:checked").value === "hadir";
  var teks = "Assalamu’alaikum. Saya " + nama + (hadir
    ? " insya Allah hadir (" + document.getElementById("f-jumlah").value + " orang)."
    : " mohon maaf belum bisa hadir.");
  var ucapan = document.getElementById("f-ucapan").value.trim();
  if (ucapan) teks += "\n\nUcapan: " + ucapan;
  pesan.textContent = "Membuka WhatsApp…";
  window.open("https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(teks), "_blank", "noopener");
});

// 7. Animasi muncul saat digulir
var target2 = document.querySelectorAll("main .isi > *:not(.kata)");
target2.forEach(function (el, i) { el.classList.add("reveal"); el.style.transitionDelay = (i % 4) * 0.12 + "s"; });
if ("IntersectionObserver" in window) {
  var amat = new IntersectionObserver(function (daftar) {
    daftar.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add("tampak"); amat.unobserve(x.target); } });
  }, { threshold: 0.1, rootMargin: "0px 0px -8% 0px" });
  target2.forEach(function (el) { amat.observe(el); });
} else { target2.forEach(function (el) { el.classList.add("tampak"); }); }

// 8. Foto yang belum ada: tampilkan "Foto menyusul"
document.querySelectorAll(".oval img").forEach(function (img) {
  function kosong() { img.parentNode.classList.add("kosong"); }
  img.addEventListener("error", kosong);
  img.addEventListener("load", function () { img.parentNode.classList.remove("kosong"); });
  if (img.complete && img.naturalWidth === 0) kosong();
});
