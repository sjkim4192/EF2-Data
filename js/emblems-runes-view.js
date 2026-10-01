import { renderAtlasIcon } from "./asset-atlas.js?v=e05c1fcbd23b";
import { loadEmblemsRunesData } from "./data.js?v=e05c1fcbd23b";
import { defaultNavLinks, renderNavbar } from "./layout.js?v=e05c1fcbd23b";
import { escapeHtml } from "./utils.js?v=e05c1fcbd23b";

const EMBLEM_ICONS = {
    A: "emblem_tnk.png",
    B: "emblem_dps.png",
    C: "emblem_hps.png",
    D: "emblem_deb.png",
    E: "emblem_buf.png",
    F: "emblem_bal.png",
};

const EMBLEM_DISPLAY_ORDER = [1, 2, 5, 4, 3, 6];

const EMBLEM_BACKGROUNDS = {
    1: "BG1.png",
    2: "BG2.png",
    3: "BG5.png",
    4: "BG4.png",
    5: "BG3.png",
    6: "BG6.png",
};

const RUNE_ICON_PREFIXES = {
    A: "rune_tnk",
    B: "rune_dps",
    C: "rune_hps",
    D: "rune_deb",
    E: "rune_buf",
    F: "rune_bal",
};

const FILTER_LABELS = {
    ALL: "전체 유닛",
    HUMAN: "휴먼 유닛",
    ELF: "엘프 유닛",
    UNDEAD: "언데드 유닛",
    ORC: "오크 유닛",
    HERO: "영웅만",
    SOLDIER: "병사만",
    MELEE: "근거리유닛",
    RANGED: "원거리유닛",
};

const CONDITION_LABELS = {
    ALWAYS: "상시 발동",
    ACTIVE: "액티브",
    PERIODIC: "주기적",
    ON_HIT: "공격 적중 시",
    ON_DAMAGED: "피격 시",
    ON_STACK: "중첩 시",
    ON_INTERRUPT: "차단 성공 시",
    ON_INTERRUPT_FAIL: "차단 실패 시",
    ON_GROGGY_START: "그로기 시작 시",
    ON_HP_LOW: "체력 낮을 때",
    ON_WEAKPOINT_HIT: "약점 적중 시",
    ON_FIRE: "발사 시",
    ON_ACTIVE_CAST: "액티브 시전 시",
    DURING_ACTIVE: "액티브 지속 중",
    ON_ACTIVE_END: "액티브 종료 시",
};

const TARGET_LABELS = {
    CORP: "장착 군단",
    SELF: "액티브",
    RAID: "전 군단",
    BOSS: "보스",
    CROSSBOW: "석궁",
};

const ROLE_NAMES_KO = {
    TANK: "탱커",
    DEALER: "딜러",
    HEALER: "힐러",
    SUPPORT: "서포터",
    BREAKER: "브레이커",
    CROSSBOW: "석궁",
};

const ACTIVE_TITLES = {
    61: "도발",
    62: "폭딜",
    63: "광역 치유",
    64: "보스 약화",
    65: "총공격",
    66: "상처 가르기",
};

const state = {
    emblems: [],
    runes: [],
    grades: [],
    runeSubs: [],
    skillMap: new Map(),
    locale: {},
    assetAtlases: {},
    selectedEmblem: null,
    selectedRune: null,
    selectedGrade: null,
    runeScrollPositions: new Map(),
    isLanding: true,
    initialized: false,
};

let els;

export async function initEmblemsRunesView() {
    if (state.initialized) return;

    els = {
        view: document.getElementById("emblemsRunesView"),
        landing: document.getElementById("emblemLanding"),
        grid: document.getElementById("emblemGrid"),
        content: document.getElementById("selectedEmblemContent"),
    };
    Object.assign(state, await loadEmblemsRunesData());
    state.initialized = true;
}

export function renderEmblemsRunesRoute() {
    if (!readRoute()) return;

    els.view.classList.remove("view-hidden");
    renderNavbar({ links: defaultNavLinks("Emblems & Runes") });

    if (state.isLanding) {
        els.landing.classList.remove("view-hidden");
        els.grid.innerHTML = getEmblemsForDisplay().map(renderEmblemCard).join("");
        els.content.innerHTML = "";
        return;
    }

    const previousRuneList = document.getElementById("emblemRuneList");
    if (previousRuneList) {
        state.runeScrollPositions.set(Number(previousRuneList.dataset.emblemId), previousRuneList.scrollTop);
    }

    els.landing.classList.add("view-hidden");
    els.content.innerHTML = renderSelectedEmblem();

    const runeList = document.getElementById("emblemRuneList");
    if (runeList) {
        runeList.scrollTop = state.runeScrollPositions.get(state.selectedEmblem.kindNum) || 0;
    }
}

function readRoute() {
    const parts = getRouteParts();
    const fallback = state.emblems[0];
    if (!fallback) return false;

    if (parts[0] !== "emblems-runes" || parts.length > 4) {
        writeLandingRoute();
        return false;
    }

    if (parts.length === 1) {
        state.isLanding = true;
        state.selectedEmblem = null;
        state.selectedRune = null;
        state.selectedGrade = null;
        return true;
    }

    const requestedEmblemId = Number(parts[1]);
    const emblem = state.emblems.find((item) => item.kindNum === requestedEmblemId);
    if (!emblem) {
        writeRoute(fallback.kindNum);
        return false;
    }

    const requestedRuneId = Number(parts[2]);
    const rune = parts[2]
        ? getRunesForEmblem(emblem).find((item) => item.kindNum === requestedRuneId)
        : null;
    if (parts[2] && !rune) {
        writeRoute(emblem.kindNum);
        return false;
    }

    const requestedGrade = Number(parts[3]);
    if (parts[3] && (!rune || !isGradeAvailable(rune, requestedGrade))) {
        writeRoute(emblem.kindNum, rune && rune.kindNum);
        return false;
    }

    state.isLanding = false;
    state.selectedEmblem = emblem;
    state.selectedRune = rune;
    state.selectedGrade = parts[3] ? requestedGrade : null;
    return true;
}

function getRouteParts() {
    return (window.location.hash || "")
        .replace(/^#\/?/, "")
        .split("?")[0]
        .split("/")
        .filter(Boolean);
}

function writeLandingRoute() {
    const route = "#/emblems-runes";
    if (window.location.hash !== route) window.location.hash = route;
}

function writeRoute(emblemId, runeId, grade) {
    const parts = ["#/emblems-runes", emblemId];
    if (runeId) parts.push(runeId);
    if (grade) parts.push(grade);
    const route = parts.join("/");
    if (window.location.hash !== route) window.location.hash = route;
}

function getRunesForEmblem(emblem) {
    return state.runes.filter((rune) => rune.type === emblem.runeType);
}

function getEmblemsForDisplay() {
    return state.emblems
        .slice()
        .sort((a, b) => EMBLEM_DISPLAY_ORDER.indexOf(a.kindNum) - EMBLEM_DISPLAY_ORDER.indexOf(b.kindNum));
}

function isGradeAvailable(rune, grade) {
    return Number.isInteger(grade) && grade >= 1 && grade <= 6 && Number(rune.values[grade - 1]) !== 0;
}

function renderEmblemCard(emblem) {
    return `
        <a class="emblem-card emblem-card-${emblem.runeType.toLowerCase()}" href="#/emblems-runes/${emblem.kindNum}" aria-label="${escapeHtml(getEmblemName(emblem))}">
            ${renderEmblemBackground(emblem)}
            ${renderEmblemIcon(emblem, 96)}
        </a>
    `;
}

function renderSelectedEmblem() {
    const emblem = state.selectedEmblem;
    const passive = state.skillMap.get(emblem.pSkill);
    const active = state.skillMap.get(emblem.aSkill);
    const runes = getRunesForEmblem(emblem);

    return `
        <a class="btn btn-default detail-back-link" href="#/emblems-runes">휘장 목록으로</a>
        <section class="relic-panel emblem-summary-panel">
            <div class="emblem-summary-title">
                <h3 class="relic-title">${escapeHtml(getEmblemName(emblem))} <span class="emblem-summary-meta">${escapeHtml(ROLE_NAMES_KO[emblem.role] || emblem.role)} &middot; 룬 타입 ${escapeHtml(emblem.runeType)}</span></h3>
            </div>
            <div class="emblem-summary-content">
                <span class="emblem-summary-icon">${renderEmblemBackground(emblem)}${renderEmblemIcon(emblem, 118)}</span>
                <div class="emblem-effects">
                    ${renderEmblemEffect("패시브", passive, emblem.pValue)}
                    ${renderEmblemEffect("액티브", active, emblem.aValue, emblem)}
                </div>
            </div>
        </section>
        ${renderRuneDetail(emblem, state.selectedRune, state.selectedGrade)}
        <section class="relic-panel emblem-runes-panel">
            <h4>장착 가능한 룬 <span class="emblem-rune-count">${runes.length}</span></h4>
            <div class="emblem-rune-list" id="emblemRuneList" data-emblem-id="${emblem.kindNum}">${runes.map(renderRuneRow).join("")}</div>
        </section>
    `;
}

function renderEmblemEffect(label, skill, value, emblem) {
    const badges = getSkillBadges(skill);
    const activeDisplay = emblem ? getActiveEffectDisplay(skill, value) : null;
    if (emblem) {
        badges.push(
            { label: `지속시간: ${formatValue(emblem.aDur)}초`, className: "timing" },
            { label: `재사용 대기시간: ${formatValue(emblem.aCool)}초`, className: "timing" },
        );
    }
    return `
        <div class="emblem-effect">
            <span class="emblem-effect-label">${escapeHtml(label)}</span>
            <div class="emblem-effect-content">
                <div class="emblem-effect-heading">
                    ${activeDisplay ? `<span class="emblem-active-title">${escapeHtml(activeDisplay.title)}</span>` : ""}
                    ${renderInfoBadges(badges)}
                </div>
                <strong>${escapeHtml(activeDisplay ? activeDisplay.description : formatEffect(skill, value))}</strong>
            </div>
        </div>
    `;
}

function renderRuneRow(rune) {
    const skill = state.skillMap.get(rune.skillRef);
    const firstAvailableGrade = rune.values.findIndex((value) => Number(value) !== 0) + 1;
    return `
        <div class="emblem-rune-row">
            <div class="emblem-rune-copy">
                <strong>룬 #${rune.kindNum}</strong>
                ${renderRuneInfoBadges(skill)}
                <small>${escapeHtml(formatEffect(skill, rune.values[firstAvailableGrade - 1] || 0))}</small>
            </div>
            <div class="rune-grade-selector" aria-label="룬 ${rune.kindNum} 등급">
                ${state.grades.map((grade) => renderGradeButton(rune, grade.grade)).join("")}
            </div>
        </div>
    `;
}

function renderGradeButton(rune, grade) {
    const available = isGradeAvailable(rune, grade);
    const selected = state.selectedRune && state.selectedRune.kindNum === rune.kindNum && state.selectedGrade === grade;
    const className = `rune-grade-option${selected ? " active" : ""}${available ? "" : " unavailable"}`;
    const icon = renderRuneIcon(rune, grade, 40);
    const label = `${getGradeName(grade)}${available ? "" : " (없음)"}`;

    if (!available) {
        return `<span class="${className}" aria-label="${escapeHtml(label)}" aria-disabled="true">${icon}</span>`;
    }

    return `
        <a class="${className}" href="#/emblems-runes/${state.selectedEmblem.kindNum}/${rune.kindNum}/${grade}" aria-label="${escapeHtml(label)}" aria-current="${selected ? "page" : "false"}">
            ${icon}
        </a>
    `;
}

function renderRuneDetail(emblem, rune, grade) {
    if (!rune) {
        return `
            <section class="relic-panel rune-detail-panel rune-selection-prompt">
                <h4>룬 상세</h4>
                <p>룬 등급을 선택하면 효과를 볼 수 있습니다.</p>
            </section>
        `;
    }

    if (!grade) {
        return `
            <section class="relic-panel rune-detail-panel rune-selection-prompt">
                <h4>룬 #${rune.kindNum}</h4>
                <p>선택 가능한 등급 중 하나를 고르면 효과를 볼 수 있습니다.</p>
            </section>
        `;
    }

    const skill = state.skillMap.get(rune.skillRef);
    const value = rune.values[grade - 1];
    const subOptions = getSubOptions(emblem, grade);
    return `
        <section class="relic-panel rune-detail-panel">
            <div class="rune-detail-header">
                ${renderRuneIcon(rune, grade, 64)}
                <div>
                    <h4>룬 #${rune.kindNum} &middot; ${escapeHtml(getGradeName(grade))}</h4>
                    ${renderRuneInfoBadges(skill)}
                    <div class="rune-detail-meta">${escapeHtml(getEmblemName(emblem))} 전용 &middot; 적용 대상: ${escapeHtml(getFilterLabel(rune.filter))}</div>
                </div>
            </div>
            <div class="rune-selected-effect">${escapeHtml(formatEffect(skill, value))}</div>
            ${renderSubOptions(subOptions, grade)}
        </section>
    `;
}

function renderEmblemIcon(emblem, size) {
    return renderAtlasIcon(state.assetAtlases.raids, EMBLEM_ICONS[emblem.runeType], {
        label: getEmblemName(emblem),
        size,
    });
}

function renderEmblemBackground(emblem) {
    const atlas = state.assetAtlases.raids;
    const sprite = atlas && atlas.frames && atlas.frames[EMBLEM_BACKGROUNDS[emblem.kindNum]];
    if (!sprite || !atlas.size) return "";

    const frame = sprite.frame;
    const sourceSize = sprite.sourceSize || { w: frame.w, h: frame.h };
    const sizeX = (atlas.size.w / sourceSize.w) * 100;
    const positionX = (frame.x / (atlas.size.w - sourceSize.w)) * 100;
    const positionY = (frame.y / (atlas.size.h - sourceSize.h)) * 100;
    const style = [
        `background-image:url('${escapeHtml(atlas.image)}')`,
        `background-size:${sizeX.toFixed(5)}% auto`,
        `background-position:${positionX.toFixed(5)}% ${positionY.toFixed(5)}%`,
    ].join(";");

    return `<span class="emblem-atlas-background" aria-hidden="true" style="${style}"></span>`;
}

function renderRuneIcon(rune, grade, size) {
    const prefix = RUNE_ICON_PREFIXES[rune.type];
    return renderAtlasIcon(state.assetAtlases.raids, `${prefix}_${String(grade).padStart(2, "0")}.png`, {
        label: `룬 ${rune.kindNum}, ${getGradeName(grade)}`,
        size,
    });
}

function getEmblemName(emblem) {
    return state.locale[`EmblemName${emblem.kindNum}`] || `${emblem.className} 휘장`;
}

function getGradeName(grade) {
    return state.locale[`EmblemGradeName${grade}`] || `${grade}등급`;
}

function getFilterLabel(filter) {
    return FILTER_LABELS[filter] || filter;
}

function getSubOptions(emblem, grade) {
    if (grade !== 5 && grade !== 6) return [];

    return state.runeSubs.filter((sub) => (
        sub.emblems.includes(emblem.kindNum) && getSubValue(sub, grade) !== 0
    ));
}

function getSubValue(sub, grade) {
    return grade === 5 ? sub.value5 : grade === 6 ? sub.value6 : 0;
}

function renderSubOptions(subOptions, grade) {
    if (!subOptions.length) return "";

    return `
        <div class="rune-sub-options">
            <h5>추가 가능한 부가 옵션</h5>
            <p>${escapeHtml(getGradeName(grade))} 등급 룬에는 아래 옵션 중 하나가 무작위로 추가될 수 있습니다.</p>
            <div class="rune-sub-option-list">
                ${subOptions.map((sub) => {
                    const skill = state.skillMap.get(sub.skillRef);
                    return `
                        <div class="rune-sub-option">
                            ${renderRuneInfoBadges(skill)}
                            <strong>${escapeHtml(formatEffect(skill, getSubValue(sub, grade)))}</strong>
                        </div>
                    `;
                }).join("")}
            </div>
        </div>
    `;
}

function getActiveEffectDisplay(skill, value) {
    const effect = formatEffect(skill, value);
    const parts = effect.split(/\s+(?:\u2014|\u00e2\u20ac\u201d)\s+/);
    const title = ACTIVE_TITLES[skill && skill.kindNum] || parts[0] || "액티브";
    const description = parts.length > 1 ? parts.slice(1).join(" — ") : effect;
    return { title, description };
}

function renderRuneInfoBadges(skill) {
    return renderInfoBadges(getSkillBadges(skill));
}

function getSkillBadges(skill) {
    if (!skill) return [];

    return [
        { label: CONDITION_LABELS[skill.condition] || skill.condition, className: "condition" },
        { label: TARGET_LABELS[skill.target] || skill.target, className: `target target-${String(skill.target || "").toLowerCase()}` },
    ].filter((badge, index, list) => badge.label && list.findIndex((item) => item.label === badge.label) === index);
}

function renderInfoBadges(badges) {
    if (!badges.length) return "";
    return `<span class="rune-info-badges">${badges.map((badge) => `<span class="rune-info-badge ${badge.className}">${escapeHtml(badge.label)}</span>`).join("")}</span>`;
}

function formatEffect(skill, value) {
    if (!skill) return `수치: ${formatValue(value)}`;
    const template = state.locale[`EmblemDesc${skill.kindNum}`] || skill.id || "효과 {v}";
    return template.replace(/\{v\}/g, formatValue(value));
}

function formatValue(value) {
    const number = Number(value || 0);
    if (Number.isInteger(number)) return String(number);
    return String(Number(number.toFixed(4)));
}
