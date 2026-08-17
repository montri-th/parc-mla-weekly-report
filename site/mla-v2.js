/*
 * PARC MLA Weekly Report — v2 insight panel (additive, fail-silent)
 * Reads the live feed (v1.2) and renders an always-informative operating layer
 * above the existing report. Sections:
 *   S1 per-section dates
 *   S2 trigger banner (what changed enough to act)
 *   S3 velocity leaderboard — reviews/day AND % of own base, PARC highlighted
 *   S4 tenant voice distribution — concentration + silent shops (with base size)
 *   S5 rating movers — venues/tenants whose rating shifted
 *   S6 system health — verification queue / bottleneck
 *   S7 tenant themes — what customers keep saying
 *   S8 role lens — every role: what they see -> what to do
 * If the feed is older than v1.2 or a field is missing, each section shows an
 * honest empty state. Never throws into the host page. Landometer DS v0.8.8
 * tokens via CSS vars, so it follows the site's light/dark theme automatically.
 */
(function () {
  'use strict';

  var TH = {
    panelTitle: 'สรุปเชิงลงมือ',
    s1: 'ข้อมูล ณ',
    s2: 'สัปดาห์นี้มีอะไรต้องขยับ',
    s2empty: 'สัปดาห์นี้ยังไม่มีสัญญาณเข้าเกณฑ์ — ระบบตรวจแล้ว ไม่ใช่ไม่ได้ดู',
    s3: 'ความเร็วเสียง เทียบขนาดตัวเอง',
    s3note: 'รีวิวใหม่ต่อวัน และคิดเป็นกี่ % ของฐานรีวิวเดิม — ขนาดเล็กที่โตเร็วสำคัญกว่าฐานใหญ่ที่นิ่ง',
    s3empty: 'ยังมีข้อมูลรอบเดียว ต้องเก็บอีกรอบจึงเทียบความเร็วได้',
    s4: 'เสียงร้านค้ากระจุกอยู่ที่ไหน',
    s4empty: 'ยังเทียบการกระจายไม่ได้ในรอบนี้',
    s5: 'เรตติ้งที่ขยับรอบนี้',
    s5empty: 'เรตติ้งไม่ขยับเลยทั้งศูนย์และร้านในรอบนี้',
    s6: 'สุขภาพระบบ — คิวที่ค้าง',
    s6empty: 'ยังไม่มีข้อมูลสถานะระบบ',
    s7: 'สิ่งที่ลูกค้าพูดถึงบ่อย',
    s7empty: 'ยังไม่มีธีมที่ผ่านการตรวจ',
    s8: 'แต่ละบทบาทเห็นอะไร ทำอะไรต่อ',
    s8empty: 'ยังไม่ได้ตั้งค่า Role Lens (แท็บ 22_ROLE_LENS)',
    reviewsPerDay: 'รีวิว/วัน',
    ofBase: 'ของฐาน',
    since: 'เทียบรอบ',
    silent: 'ร้านที่เงียบรอบนี้',
    share: 'ของเสียงใหม่ทั้งหมด',
    fired: 'มีสัญญาณ',
    quiet: 'ยังเงียบ',
    verified: 'ตรวจแล้ว',
    pending: 'รอตรวจ',
    curated: 'คัดเข้าระบบ',
    bottleneck: 'คอขวดอยู่ที่การตรวจ ไม่ใช่การเก็บข้อมูล — ปลดคิวนี้ก่อน ตัวเลขอื่นถึงจะขยับ',
    obs: 'ครั้ง',
    shops: 'ร้าน'
  };
  var TRIGGER_LABEL = {
    T1: 'เรตติ้งศูนย์ขยับ', T2: 'ความเร็วรีวิวเร่ง', T3: 'เรตติ้งร้านขยับ',
    T4: 'ร้านเงียบ', T5: 'สถานะสัญญาณเปลี่ยน', T6: 'เหตุใน watchlist',
    T7: 'ร้านเปลี่ยนสถานะ', T8: 'ธีมใหม่ผ่านการตรวจ'
  };
  var TONE_LABEL = { risk: 'ต้องระวัง', watch: 'จับตา', opportunity: 'โอกาส' };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function sign(n) { return n == null ? '' : (n > 0 ? '+' : '') + n; }
  function comma(n) { return n == null ? '' : String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  // ---- pure render core (also exported for Node tests) ----
  function buildHTML(feed, snapshotMeta) {
    if (!feed || !feed.meta) return '';
    var m = feed.meta;
    var sec = m.sectionDataAsOf || {};
    var snapDate = snapshotMeta && snapshotMeta.dataAsOf ? snapshotMeta.dataAsOf : null;

    // S1
    var dateBits = [];
    if (sec.tenants) dateBits.push('ร้านค้า ' + esc(sec.tenants));
    if (sec.venues) dateBits.push('ศูนย์ ' + esc(sec.venues));
    if (sec.signals) dateBits.push('สัญญาณ ' + esc(sec.signals));
    if (snapDate) dateBits.push('รีวิว/กราฟ ' + esc(snapDate) + ' (ชุดที่ตรวจแล้ว)');
    var s1 = '<div class="mlav2-s1"><span class="mlav2-eyebrow">' + TH.s1 + '</span>' +
      '<span class="mlav2-dates">' + dateBits.join(' · ') + '</span></div>';

    // S2 triggers
    var triggers = Array.isArray(feed.triggers) ? feed.triggers : [];
    var s2body;
    if (!triggers.length) {
      s2body = '<p class="mlav2-empty">' + TH.s2empty + '</p>';
    } else {
      s2body = '<ul class="mlav2-trigs">' + triggers.map(function (t) {
        var names = t.names && t.names.length ? '<span class="mlav2-names">' + esc(t.names.join(' · ')) + '</span>' : '';
        return '<li class="mlav2-trig mlav2-trig--' + esc((t.code || '').toLowerCase()) + '">' +
          '<span class="mlav2-chip">' + esc(t.code) + '</span>' +
          '<span class="mlav2-trig-label">' + esc(TRIGGER_LABEL[t.code] || t.label || '') + '</span>' +
          '<span class="mlav2-trig-detail">' + esc(t.label || '') + (t.detail ? ' — ' + esc(t.detail) : '') + '</span>' +
          names + '</li>';
      }).join('') + '</ul>';
    }
    var s2 = section(TH.s2, s2body);

    // S3 velocity leaderboard (all venues with 2+ rounds), reviews/day + % of base, PARC highlighted
    var vv = (feed.venues || []).filter(function (v) { return v.velocity && v.velocity.rounds >= 2 && v.velocity.perDay != null; })
      .map(function (v) {
        var base = (v.reviews != null && v.velocity.reviewsDelta != null) ? (v.reviews - v.velocity.reviewsDelta) : null;
        var pct = (base && base > 0) ? Math.round((v.velocity.reviewsDelta / base) * 1000) / 10 : null;
        return { id: v.id, name: v.name, type: v.type || '', reviews: v.reviews, delta: v.velocity.reviewsDelta, perDay: v.velocity.perDay, pct: pct, ratingDelta: v.velocity.ratingDelta, prev: v.velocity.prevObservedAt, isParc: /^P00$/i.test(v.id || '') };
      });
    var s3body;
    if (!vv.length) {
      s3body = '<p class="mlav2-empty">' + TH.s3empty + '</p>';
    } else {
      // Honest lead: compare PARC only against mall-type peers (exclude night market / home goods),
      // and name the fastest small-format outlier separately so % is not compared across venue types.
      var malls = vv.filter(function (x) { return /mall/i.test(x.type) && x.pct != null; });
      var mallsByPct = malls.slice().sort(function (a, b) { return (b.pct || 0) - (a.pct || 0); });
      var parc = vv.filter(function (x) { return x.isParc; })[0];
      var outlier = vv.filter(function (x) { return !/mall/i.test(x.type) && x.pct != null; })
        .sort(function (a, b) { return (b.pct || 0) - (a.pct || 0); })[0];
      var lead = '';
      if (parc && parc.pct != null && mallsByPct[0] && mallsByPct[0].isParc) {
        var bigMax = malls.filter(function (x) { return !x.isParc; }).reduce(function (a, x) { return Math.max(a, x.pct || 0); }, 0);
        var tail = outlier && outlier.pct > parc.pct
          ? ' (' + esc(outlier.name) + ' +' + outlier.pct + '% เป็นฐานเล็กคนละประเภท แยกดู)'
          : '';
        lead = '<p class="mlav2-lead">PARC โตเร็วสุดในกลุ่มห้าง/คอมมูนิตี้มอลล์: <strong>+' + parc.pct + '% ของฐาน</strong> ขณะที่มอลล์อื่นสูงสุดแค่ +' + bigMax + '% แม้ PARC ฐานเล็กกว่ามาก' + tail + '</p>';
      }
      var byRate = vv.slice().sort(function (a, b) { return (b.perDay || 0) - (a.perDay || 0); });
      var maxRate = byRate[0].perDay || 1;
      s3body = '<p class="mlav2-note">' + TH.s3note + '</p>' + lead +
        '<div class="mlav2-pulse">' + byRate.map(function (v) {
          var w = Math.max(3, Math.round((v.perDay / maxRate) * 100));
          var tot = v.reviews != null ? '<span class="mlav2-ptot">' + comma(v.reviews) + ' รีวิว' + (v.delta != null ? ' (' + sign(v.delta) + ')' : '') + '</span>' : '';
          var pct = v.pct != null ? '<span class="mlav2-pct">+' + v.pct + '% ' + TH.ofBase + '</span>' : '';
          return '<div class="mlav2-prow' + (v.isParc ? ' mlav2-prow--hi' : '') + '">' +
            '<span class="mlav2-pname">' + (v.isParc ? '★ ' : '') + esc(v.name) + '</span>' +
            '<span class="mlav2-pbarwrap"><span class="mlav2-pbar" style="width:' + w + '%"></span></span>' +
            '<span class="mlav2-pval">' + esc(v.perDay) + ' ' + TH.reviewsPerDay + '</span>' + pct + tot + '</div>';
        }).join('') + '</div>' +
        '<p class="mlav2-foot">' + TH.since + ' ' + esc(byRate[0].prev || '') + '</p>';
    }
    var s3 = section(TH.s3, s3body);

    // S4 distribution
    var d = feed.tenantDistribution;
    var s4body;
    if (!d || d.tenantsCounted == null || d.totalReviewsGain == null) {
      s4body = '<p class="mlav2-empty">' + TH.s4empty + '</p>';
    } else {
      var top = (d.top3 || []).map(function (x) {
        return '<div class="mlav2-drow"><span class="mlav2-pname">' + esc(x.name) + '</span>' +
          '<span class="mlav2-pbarwrap"><span class="mlav2-pbar" style="width:' + Math.max(3, x.share || 0) + '%"></span></span>' +
          '<span class="mlav2-pval">+' + esc(x.delta) + ' · ' + esc(x.share) + '%</span></div>';
      }).join('');
      var silentList = (d.silent && d.silent.length) ?
        '<p class="mlav2-foot"><strong>' + TH.silent + ' (' + d.silentCount + '):</strong> ' + esc(d.silent.join(' · ')) + '</p>' : '';
      s4body = '<p class="mlav2-lead"><strong>' + esc(d.top3SharePct) + '%</strong> ' + TH.share +
        ' มาจาก 3 ร้านบนสุด จาก ' + esc(d.tenantsCounted) + ' ร้านที่วัดได้</p>' + top + silentList;
    }
    var s4 = section(TH.s4, s4body);

    // S5 rating movers (venues + tenants with ratingDelta != 0)
    var movers = [];
    (feed.venues || []).forEach(function (v) { if (v.velocity && v.velocity.ratingDelta) movers.push({ name: v.name, d: v.velocity.ratingDelta, now: v.rating }); });
    (feed.tenants || []).forEach(function (t) { if (t.velocity && t.velocity.ratingDelta) movers.push({ name: t.name, d: t.velocity.ratingDelta, now: t.rating }); });
    movers.sort(function (a, b) { return Math.abs(b.d) - Math.abs(a.d); });
    var s5body;
    if (!movers.length) {
      s5body = '<p class="mlav2-empty">' + TH.s5empty + '</p>';
    } else {
      s5body = '<div class="mlav2-movers">' + movers.map(function (x) {
        var now = x.now != null ? '<span class="mlav2-mnow">★' + esc(x.now) + '</span> ' : '';
        return '<span class="mlav2-mover mlav2-mover--' + (x.d > 0 ? 'up' : 'down') + '">' +
          esc(x.name) + ' ' + now + '<b>' + sign(x.d) + '</b></span>';
      }).join('') + '</div>';
    }
    var s5 = section(TH.s5, s5body);

    // S6 system health (verification queue)
    var ss = feed.statusSummary;
    var s6body;
    if (!ss || ss.total == null) {
      s6body = '<p class="mlav2-empty">' + TH.s6empty + '</p>';
    } else {
      var stat = function (label, val, tone) {
        return '<div class="mlav2-stat mlav2-stat--' + tone + '"><span class="mlav2-statv">' + esc(val) + '</span>' +
          '<span class="mlav2-statl">' + label + '</span></div>';
      };
      var pendTone = (ss.pending && ss.verified != null && ss.pending > ss.verified) ? 'risk' : 'watch';
      s6body = '<div class="mlav2-stats">' +
        stat(TH.verified, ss.verified, 'ok') +
        stat(TH.pending, ss.pending, ss.pending > 0 ? pendTone : 'ok') +
        stat(TH.curated, ss.curated, 'neutral') +
        stat('รวม', ss.total, 'neutral') + '</div>' +
        (ss.pending && ss.pending > 0
          ? '<p class="mlav2-foot mlav2-warn">' + TH.bottleneck + '</p>'
          : (ss.verified ? '<p class="mlav2-foot mlav2-ok">คิว verification เคลียร์แล้ว — พร้อมออกรายงานเต็มตาม trigger</p>' : ''));
    }
    var s6 = section(TH.s6, s6body);

    // S7 tenant themes
    var themes = Array.isArray(feed.tenantThemes) ? feed.tenantThemes : [];
    var s7body;
    if (!themes.length) {
      s7body = '<p class="mlav2-empty">' + TH.s7empty + '</p>';
    } else {
      s7body = '<div class="mlav2-themes">' + themes.slice().sort(function (a, b) { return (b.count || 0) - (a.count || 0); }).map(function (t) {
        return '<div class="mlav2-theme mlav2-theme--' + esc(t.tone || 'watch') + '">' +
          '<span class="mlav2-theme-name">' + esc(t.name) + '</span>' +
          '<span class="mlav2-theme-meta">' + esc(t.count) + ' ' + TH.obs + ' · ' + esc(t.tenantCount) + ' ' + TH.shops +
          ' <em>' + (TONE_LABEL[t.tone] || '') + '</em></span></div>';
      }).join('') + '</div>';
    }
    var s7 = section(TH.s7, s7body);

    // S8 role lens
    var roles = Array.isArray(feed.roleLens) ? feed.roleLens : [];
    var s8body;
    if (!roles.length) {
      s8body = '<p class="mlav2-empty">' + TH.s8empty + '</p>';
    } else {
      s8body = '<div class="mlav2-roles">' + roles.map(function (r) {
        return '<div class="mlav2-role' + (r.fired ? ' mlav2-role--fired' : '') + '">' +
          '<div class="mlav2-role-head"><span class="mlav2-role-name">' + esc(r.role) + '</span>' +
          '<span class="mlav2-role-flag">' + (r.fired ? TH.fired : TH.quiet) + '</span></div>' +
          (r.insight ? '<p class="mlav2-role-insight">' + esc(r.insight) + '</p>' : '') +
          (r.actionCard ? '<p class="mlav2-role-act">→ ' + esc(r.actionCard) + '</p>' : '') +
          (r.guardrail ? '<p class="mlav2-role-guard">⚠ ' + esc(r.guardrail) + '</p>' : '') +
          '</div>';
      }).join('') + '</div>';
    }
    var s8 = section(TH.s8, s8body);

    return '<div class="mlav2-inner">' +
      '<div class="mlav2-title"><span class="mlav2-kicker">MLA</span>' + TH.panelTitle + '</div>' +
      s1 + s2 + s3 + s4 + s5 + s6 + s7 + s8 + '</div>';
  }

  function section(title, body) {
    return '<section class="mlav2-sec"><h3 class="mlav2-h">' + title + '</h3>' + body + '</section>';
  }

  var CSS = [
    '#mlav2-panel{margin:0 0 2rem;font-family:var(--font-body,inherit)}',
    '.mlav2-inner{background:var(--surface-card,#FFFDF8);border:1px solid var(--border-hairline,#D9CFC2);border-radius:18px;padding:1.5rem 1.5rem .5rem;box-shadow:0 1px 0 rgba(0,0,0,.02)}',
    '.mlav2-title{font-family:var(--font-display,inherit);font-weight:var(--weight-display-readable,200);font-size:1.6rem;color:var(--text-primary,#24312F);display:flex;align-items:center;gap:.6rem;margin-bottom:1rem}',
    '.mlav2-kicker{font-family:var(--font-body,inherit);font-weight:var(--weight-ui,500);font-size:.7rem;letter-spacing:.14em;color:var(--brand-garden,#365E55);border:1px solid var(--brand-garden,#365E55);border-radius:999px;padding:.15rem .55rem}',
    '.mlav2-s1{display:flex;flex-wrap:wrap;gap:.5rem;align-items:baseline;padding:.6rem .8rem;background:var(--surface-alt,#EFE6D9);border-radius:12px;margin-bottom:1.25rem}',
    '.mlav2-eyebrow{font-weight:var(--weight-ui,500);font-size:.72rem;letter-spacing:.1em;color:var(--text-metadata,#504A45);text-transform:uppercase}',
    '.mlav2-dates{color:var(--text-secondary,#45514D);font-size:.9rem}',
    '.mlav2-sec{margin-bottom:1.4rem}',
    '.mlav2-h{font-family:var(--font-display,inherit);font-weight:var(--weight-display-readable,200);font-size:1.15rem;color:var(--text-primary,#24312F);margin:0 0 .7rem;padding-bottom:.4rem;border-bottom:1px solid var(--border-hairline,#D9CFC2)}',
    '.mlav2-empty{color:var(--text-metadata,#504A45);font-size:.9rem;background:var(--surface-alt,#EFE6D9);border-radius:10px;padding:.7rem .9rem;margin:0}',
    '.mlav2-note{color:var(--text-metadata,#504A45);font-size:.82rem;margin:0 0 .6rem}',
    '.mlav2-trigs{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.55rem}',
    '.mlav2-trig{display:grid;grid-template-columns:auto 1fr;gap:.35rem .6rem;align-items:center;padding:.6rem .8rem;border-radius:12px;background:var(--warning-fill,#FFF1D1)}',
    '.mlav2-trig--t4{background:var(--surface-sagemist,#DDE5DE)}',
    '.mlav2-trig--t1,.mlav2-trig--t3{background:var(--danger-fill,#FCE5DF)}',
    '.mlav2-trig--t6{background:var(--surface-petalmist,#F3E0E8)}',
    '.mlav2-chip{grid-row:span 2;align-self:start;font-weight:var(--weight-ui,500);font-size:.72rem;color:var(--brand-ink,#24312F);border:1px solid var(--border-emphasis,#96877B);border-radius:8px;padding:.15rem .45rem}',
    '.mlav2-trig-label{font-weight:var(--weight-ui,500);color:var(--text-primary,#24312F);font-size:.92rem}',
    '.mlav2-trig-detail,.mlav2-names{grid-column:2;color:var(--text-secondary,#45514D);font-size:.85rem}',
    '.mlav2-pulse{display:flex;flex-direction:column;gap:.5rem}',
    '.mlav2-prow{display:grid;grid-template-columns:minmax(8rem,1.2fr) 1.6fr auto auto auto;gap:.6rem;align-items:center}',
    '.mlav2-drow{display:grid;grid-template-columns:minmax(9rem,1.3fr) 2fr auto auto;gap:.6rem;align-items:center}',
    '.mlav2-ptot{color:var(--text-metadata,#504A45);font-size:.78rem;white-space:nowrap}',
    '.mlav2-mnow{font-weight:var(--weight-ui,500)}',
    '.mlav2-prow--hi .mlav2-pname{color:var(--brand-garden,#365E55);font-weight:var(--weight-ui,500)}',
    '.mlav2-prow--hi .mlav2-pbar{background:var(--brand-bougainvillea,#A94372)}',
    '.mlav2-pname{color:var(--text-primary,#24312F);font-size:.9rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.mlav2-pbarwrap{background:var(--surface-alt,#EFE6D9);border-radius:999px;height:.55rem;overflow:hidden}',
    '.mlav2-pbar{display:block;height:100%;background:var(--brand-garden,#365E55);border-radius:999px}',
    '.mlav2-pval{color:var(--text-secondary,#45514D);font-size:.82rem;white-space:nowrap}',
    '.mlav2-pct{color:var(--brand-garden,#365E55);font-size:.78rem;font-weight:var(--weight-ui,500);white-space:nowrap}',
    '.mlav2-lead{color:var(--text-secondary,#45514D);font-size:.95rem;margin:0 0 .6rem}',
    '.mlav2-lead strong,.mlav2-foot strong{color:var(--text-primary,#24312F)}',
    '.mlav2-foot{color:var(--text-metadata,#504A45);font-size:.82rem;margin:.6rem 0 0}',
    '.mlav2-warn{color:var(--warning-ink,#795300);background:var(--warning-fill,#FFF1D1);border-radius:8px;padding:.5rem .7rem}',
    '.mlav2-ok{color:var(--success-ink,#126B49);background:var(--success-fill,#E2F4E5);border-radius:8px;padding:.5rem .7rem}',
    '.mlav2-movers{display:flex;flex-wrap:wrap;gap:.5rem}',
    '.mlav2-mover{font-size:.85rem;border-radius:8px;padding:.3rem .6rem}',
    '.mlav2-mover--up{background:var(--success-fill,#E2F4E5);color:var(--success-ink,#126B49)}',
    '.mlav2-mover--down{background:var(--danger-fill,#FCE5DF);color:var(--danger-ink,#B43A3A)}',
    '.mlav2-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(6rem,1fr));gap:.6rem}',
    '.mlav2-stat{border-radius:12px;padding:.7rem .5rem;text-align:center;background:var(--surface-alt,#EFE6D9)}',
    '.mlav2-stat--ok{background:var(--success-fill,#E2F4E5)}',
    '.mlav2-stat--risk{background:var(--danger-fill,#FCE5DF)}',
    '.mlav2-stat--watch{background:var(--warning-fill,#FFF1D1)}',
    '.mlav2-statv{display:block;font-family:var(--font-display,inherit);font-size:1.5rem;color:var(--text-primary,#24312F)}',
    '.mlav2-statl{display:block;font-size:.75rem;color:var(--text-metadata,#504A45);margin-top:.15rem}',
    '.mlav2-themes{display:grid;grid-template-columns:repeat(auto-fill,minmax(14rem,1fr));gap:.55rem}',
    '.mlav2-theme{border:1px solid var(--border-hairline,#D9CFC2);border-left-width:3px;border-radius:10px;padding:.55rem .7rem;background:var(--surface-raised,#fff)}',
    '.mlav2-theme--risk{border-left-color:var(--danger-ink,#B43A3A)}',
    '.mlav2-theme--opportunity{border-left-color:var(--success-ink,#126B49)}',
    '.mlav2-theme--watch{border-left-color:var(--border-emphasis,#96877B)}',
    '.mlav2-theme-name{display:block;color:var(--text-primary,#24312F);font-size:.88rem}',
    '.mlav2-theme-meta{display:block;color:var(--text-metadata,#504A45);font-size:.76rem;margin-top:.2rem}',
    '.mlav2-theme-meta em{font-style:normal;font-weight:var(--weight-ui,500)}',
    '.mlav2-roles{display:grid;grid-template-columns:repeat(auto-fill,minmax(15rem,1fr));gap:.7rem}',
    '.mlav2-role{border:1px solid var(--border-hairline,#D9CFC2);border-radius:12px;padding:.75rem .85rem;background:var(--surface-raised,#fff)}',
    '.mlav2-role--fired{border-color:var(--brand-garden,#365E55);box-shadow:inset 3px 0 0 var(--brand-garden,#365E55)}',
    '.mlav2-role-head{display:flex;justify-content:space-between;align-items:center;gap:.4rem;margin-bottom:.35rem}',
    '.mlav2-role-name{font-weight:var(--weight-ui,500);color:var(--text-primary,#24312F);font-size:.95rem}',
    '.mlav2-role-flag{font-size:.68rem;letter-spacing:.06em;color:var(--text-metadata,#504A45)}',
    '.mlav2-role--fired .mlav2-role-flag{color:var(--brand-garden,#365E55)}',
    '.mlav2-role-insight{color:var(--text-secondary,#45514D);font-size:.85rem;margin:.15rem 0}',
    '.mlav2-role-act{color:var(--brand-garden,#365E55);font-size:.85rem;font-weight:var(--weight-ui,500);margin:.25rem 0 .15rem}',
    '.mlav2-role-guard{color:var(--warning-ink,#795300);font-size:.78rem;margin:.15rem 0 0}',
    '@media(max-width:640px){.mlav2-prow,.mlav2-drow{grid-template-columns:1fr auto}.mlav2-pbarwrap{grid-column:1/-1;order:3}}'
  ].join('');

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { buildHTML: buildHTML };
    return;
  }

  function boot() {
    try {
      if (document.getElementById('mlav2-panel')) return;
      var style = document.createElement('style');
      style.id = 'mlav2-style';
      style.textContent = CSS;
      document.head.appendChild(style);

      var panel = document.createElement('section');
      panel.id = 'mlav2-panel';
      panel.setAttribute('aria-label', 'สรุปเชิงลงมือ');

      var main = document.querySelector('main') || document.body;
      var anchorCard = document.querySelector('#asOf');
      var anchor = anchorCard ? anchorCard.closest('section, form, div[class]') : null;
      if (anchor && anchor.parentNode === main) main.insertBefore(panel, anchor.nextSibling);
      else if (main.firstElementChild) main.insertBefore(panel, main.firstElementChild.nextSibling);
      else main.appendChild(panel);

      fetchFeed(function (feed) {
        try {
          var snapMeta = (window.MLA_SNAPSHOT && window.MLA_SNAPSHOT.meta) || null;
          var html = buildHTML(feed, snapMeta);
          if (html) panel.innerHTML = html; else panel.remove();
        } catch (e) { panel.remove(); }
      });
    } catch (e) { /* never break host page */ }
  }

  function fetchFeed(cb) {
    fetch('/.netlify/functions/data', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(cb)
      .catch(function () {
        fetch('./data/snapshot.json', { cache: 'no-store' })
          .then(function (r) { return r.json(); })
          .then(cb)
          .catch(function () { var p = document.getElementById('mlav2-panel'); if (p) p.remove(); });
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
