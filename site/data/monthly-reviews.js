// Google Maps UI · sort=Newest · observed 3 Aug 2026.
// One count per unique review_id. "Edited … ago" and the ambiguous "a year ago"
// boundary are excluded because their original creation month is unknown.
window.MLA_MONTHLY_REVIEW_COUNTS = {
  metricName: "captured_reviews_by_relative_age",
  observedAt: "2026-08-03",
  months: [
    { key: "11m", label: "11 ด.ก่อน" },
    { key: "10m", label: "10 ด.ก่อน" },
    { key: "9m", label: "9 ด.ก่อน" },
    { key: "8m", label: "8 ด.ก่อน" },
    { key: "7m", label: "7 ด.ก่อน" },
    { key: "6m", label: "6 ด.ก่อน" },
    { key: "5m", label: "5 ด.ก่อน" },
    { key: "4m", label: "4 ด.ก่อน" },
    { key: "3m", label: "3 ด.ก่อน" },
    { key: "2m", label: "2 ด.ก่อน" },
    { key: "1m", label: "1 ด.ก่อน" },
    { key: "0-4w", label: "0–4 สัปดาห์" }
  ],
  parc: {
    id: "P00",
    name: "PARC Bangna",
    counts: [68, 71, 94, 68, 83, 61, 53, 72, 60, 65, 75, 76],
    quality: { uniqueLoaded: 900, used: 846, editedExcluded: 23, yearBoundaryExcluded: 31 }
  },
  competitors: [
    {
      id: "C01",
      name: "Central Bangna",
      counts: [80, 55, 77, 53, 71, 68, 63, 89, 94, 84, 89, 92],
      quality: { uniqueLoaded: 960, used: 915, editedExcluded: 41, yearBoundaryExcluded: 4 }
    },
    {
      id: "C02",
      name: "Megabangna",
      counts: [239, 207, 241, 161, 232, 195, 157, 217, 221, 210, 152, 171],
      incompleteIndexes: [0],
      quality: {
        uniqueLoaded: 2720,
        used: 2403,
        editedExcluded: 317,
        yearBoundaryExcluded: 0,
        complete: false,
        coverageNote: "ช่วงล่าสุดถึง 10 เดือนก่อนเก็บได้ครบตามหน้าที่ Google แสดง ส่วน 11 เดือนก่อนเป็นอย่างน้อยเท่าที่เห็น เพราะหน้าหยุดโหลดก่อนถึงขอบ 1 ปี"
      }
    },
    {
      id: "C03",
      name: "Seacon Square Srinakarin",
      counts: [200, 154, 135, 142, 114, 147, 119, 149, 135, 136, 129, 141],
      quality: { uniqueLoaded: 1960, used: 1701, editedExcluded: 246, yearBoundaryExcluded: 13 }
    },
    {
      id: "C04",
      name: "Paradise Park",
      counts: [65, 59, 78, 47, 49, 40, 57, 62, 54, 60, 55, 42],
      quality: { uniqueLoaded: 800, used: 668, editedExcluded: 123, yearBoundaryExcluded: 9 }
    },
    {
      id: "C05",
      name: "Dadfa Lasalle",
      counts: [13, 11, 13, 5, 75, 9, 6, 3, 7, 5, 3, 8],
      quality: { uniqueLoaded: 170, used: 158, editedExcluded: 8, yearBoundaryExcluded: 4 }
    },
    {
      id: "C06",
      name: "Little Walk Bang Na",
      counts: [16, 6, 12, 5, 5, 8, 4, 10, 11, 9, 8, 10],
      quality: { uniqueLoaded: 130, used: 104, editedExcluded: 21, yearBoundaryExcluded: 5 }
    },
    {
      id: "C07",
      name: "La Salle's Avenue",
      counts: [17, 28, 38, 14, 32, 30, 17, 21, 17, 21, 16, 14],
      quality: { uniqueLoaded: 290, used: 265, editedExcluded: 24, yearBoundaryExcluded: 1 }
    },
    {
      id: "C09",
      name: "JAS Urban Srinakarin",
      counts: [19, 18, 16, 13, 17, 22, 16, 15, 11, 23, 16, 14],
      quality: { uniqueLoaded: 230, used: 200, editedExcluded: 23, yearBoundaryExcluded: 7 }
    },
    {
      id: "C10",
      name: "Design Village Bangna",
      counts: [13, 14, 12, 10, 6, 6, 3, 7, 7, 6, 3, 6],
      quality: { uniqueLoaded: 110, used: 93, editedExcluded: 8, yearBoundaryExcluded: 9 }
    },
    {
      id: "C11",
      name: "Save One Go Night Market",
      counts: [0, 0, 0, 0, 1, 10, 61, 143, 120, 77, 69, 66],
      quality: { uniqueLoaded: 557, used: 547, editedExcluded: 10, yearBoundaryExcluded: 0 }
    }
  ],
  note: "เก็บจาก Google Maps เมื่อ 3 ส.ค. 2569 · แบ่งตามคำบอกเวลาที่ Google แสดง จึงเป็น 12 ช่วงย้อนหลัง ไม่ใช่ยอดเดือนปฏิทิน · ไม่นับรายการที่แสดงเวลาแก้ไขและรายการที่อยู่ตรงขอบ 1 ปี"
};
