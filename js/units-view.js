import { renderAtlasIcon, renderAtlasIconById } from "./asset-atlas.js?v=e05c1fcbd23b";
import { loadUnitData } from "./data.js?v=e05c1fcbd23b";
import { defaultNavLinks, renderNavbar } from "./layout.js?v=e05c1fcbd23b";
import { escapeHtml, formatNumber } from "./utils.js?v=e05c1fcbd23b";

const TRIBES = [
    { id: 1, label: "휴먼" },
    { id: 2, label: "엘프" },
    { id: 3, label: "언데드" },
    { id: 4, label: "오크" },
];

const DETAIL_TABS = ["details", "skills", "ascend"];
const GOLD_BUFF_UNLOCK_LEVELS = [25, 50, 75, 100, 200, 300, 500, 700, 1000, 1500, 2000, 3000];
const EVOLUTION_GEM_COSTS_BY_GRADE = {
    2: 200,
    3: 300,
    4: 500,
    5: 1000,
    6: 2000,
};
const TRANS_HONOR_COIN_COSTS = [100, 200, 300];

const state = {
    units: [],
    unitMap: new Map(),
    petByCoupleMap: new Map(),
    heroGoldSkillMap: new Map(),
    heroUniqueSkillMap: new Map(),
    locale: {},
    assetAtlases: {},
    selectedKindNum: 1,
    selectedTribe: 1,
    selectedTab: "details",
    initialized: false,
};

let els;

export async function initUnitsView() {
    if (state.initialized) return;

    els = getElements();
    Object.assign(state, await loadUnitData());
    readRoute();
    state.initialized = true;
}

export function renderUnitsRoute() {
    readRoute();
    const parts = getRouteParts();
    if (parts[0] === "units" && parts[1]) {
        showDetail();
        return;
    }

    showList();
}

function getElements() {
    return {
        listView: document.getElementById("unitListView"),
        detailView: document.getElementById("unitDetailView"),
        tabs: document.getElementById("unitTribeTabs"),
        content: document.getElementById("unitContent"),
        backLink: document.getElementById("unitBackLink"),
        title: document.getElementById("unitTitle"),
        meta: document.getElementById("unitMeta"),
        mainIcon: document.getElementById("unitMainIcon"),
        detailBody: document.getElementById("unitGameDetail"),
    };
}

function text(key, fallback) {
    return state.locale[key] || fallback || key;
}

function getUnitName(unit) {
    return text(`UNIT_NAME_${unit.kindNum}`, unit.name || `영웅 ${unit.kindNum}`);
}

function readRoute() {
    const parts = getRouteParts();

    if (parts[0] !== "units") {
        window.location.hash = "#/units";
        return;
    }

    const requestedKindNum = Number(parts[1]);
    if (state.unitMap.has(requestedKindNum)) {
        const unit = state.unitMap.get(requestedKindNum);
        state.selectedKindNum = requestedKindNum;
        state.selectedTribe = unit.tribe;
    }
}

function getRouteParts() {
    return (window.location.hash || "#/units")
        .replace(/^#\/?/, "")
        .split("?")[0]
        .split("/")
        .filter(Boolean);
}

function showList() {
    els.detailView.classList.add("view-hidden");
    els.listView.classList.remove("view-hidden");
    renderNavbar({
        links: defaultNavLinks("Units"),
    });
    renderList();
}

function showDetail() {
    els.listView.classList.add("view-hidden");
    els.detailView.classList.remove("view-hidden");
    renderNavbar({
        links: defaultNavLinks("Units"),
    });
    renderDetail();
}

function renderList() {
    renderTabs();
    renderListContent();
}

function renderTabs() {
    els.tabs.innerHTML = TRIBES.map((tribe) => {
        const active = tribe.id === state.selectedTribe ? " class=\"active\"" : "";
        return `<li${active}><a href="#/units" data-tribe="${tribe.id}" title="${escapeHtml(tribe.label)}" aria-label="${escapeHtml(tribe.label)}">${renderTribeTabIcon(tribe.id, tribe.label)}</a></li>`;
    }).join("");

    els.tabs.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", (event) => {
            event.preventDefault();
            state.selectedTribe = Number(link.dataset.tribe);
            writeListRoute();
            renderList();
        });
    });
}

function renderListContent() {
    const units = state.units.filter((unit) => unit.tribe === state.selectedTribe);
    els.content.classList.add("icon-grid");

    if (!units.length) {
        els.content.textContent = "이 종족의 영웅이 없습니다.";
        return;
    }

    els.content.innerHTML = getListEvolutionPairs(units).map(renderEvolutionListPair).join("");
}

function getListEvolutionPairs(units) {
    const tribeUnitIds = new Set(units.map((unit) => unit.kindNum));
    const pairedIds = new Set();
    const pairs = [];

    units.forEach((unit) => {
        if (pairedIds.has(unit.kindNum)) return;

        const previous = state.units.find((candidate) => candidate.evolKindNum === unit.kindNum);
        if (previous && tribeUnitIds.has(previous.kindNum)) return;

        const evolution = unit.evolKindNum > 0 ? state.unitMap.get(unit.evolKindNum) : null;
        if (evolution && tribeUnitIds.has(evolution.kindNum)) {
            pairs.push([evolution, unit]);
            pairedIds.add(unit.kindNum);
            pairedIds.add(evolution.kindNum);
            return;
        }

        pairs.push([unit]);
        pairedIds.add(unit.kindNum);
    });

    units.forEach((unit) => {
        if (!pairedIds.has(unit.kindNum)) pairs.push([unit]);
    });

    return pairs;
}

function renderEvolutionListPair(pair) {
    return `<span class="unit-list-pair">${pair.map(renderImageItem).join("")}</span>`;
}

function renderImageItem(unit) {
    const name = getUnitName(unit);
    return `<a href="#/units/${unit.kindNum}" title="${escapeHtml(name)}">${renderUnitListPortrait(unit)}</a>`;
}

function renderDetail() {
    const unit = state.unitMap.get(state.selectedKindNum);
    if (!unit) return;

    const name = getUnitName(unit);
    els.backLink.href = "#/units";
    els.title.textContent = name;
    els.meta.textContent = `${getTribeName(unit.tribe)} ${unit.grade}*`;
    els.mainIcon.innerHTML = renderUnitIcon(unit.kindNum, {
        label: name,
        className: "relic-main-icon-sprite",
        size: 64,
    });
    if (!DETAIL_TABS.includes(state.selectedTab)) state.selectedTab = "details";
    els.detailBody.innerHTML = renderGameDetail(unit);
    bindDetailTabs(unit);
}

function renderGameDetail(unit) {
    const name = getUnitName(unit);
    return `
        <section class="unit-game-card">
            <div class="unit-game-header">
                ${renderUnitEvolutionStrip(unit)}
                <div class="unit-game-summary">
                    <div class="unit-game-title-row">
                        <div class="unit-title-stack">
                            <h3>${escapeHtml(name)}</h3>
                            <span class="unit-stars" aria-label="${unit.grade}성">${renderRarity(unit.grade)}</span>
                        </div>
                        <span class="unit-header-badges">${renderHeaderBadges(unit)}</span>
                    </div>
                </div>
            </div>
            <div class="unit-core-stats">
                ${renderCoreStat("UI_HEART", formatStat(unit.hp))}
                ${renderCoreStat(unit.dmgType === "P" ? "UI_SWORD" : "ICON_ATTACK2", formatStat(unit.atkDmg))}
                ${renderCoreStat("UI_PHY_DEFENSE", formatStat(unit.phyDef))}
                ${renderCoreStat("UI_MAGIC_DEFENSE", formatStat(unit.magDef))}
                ${renderCoreStat("ICON_UNIT", formatStat(unit.numBlock || 0))}
            </div>
            <div class="unit-detail-tabs" role="tablist">
                ${DETAIL_TABS.map((tab) => renderDetailTab(tab)).join("")}
            </div>
            <div class="unit-tab-panel">
                ${renderSelectedTab(unit)}
            </div>
        </section>
    `;
}

function renderUnitEvolutionStrip(unit) {
    const variants = getEvolutionVariants(unit);
    return `<div class="unit-evolution-strip">${variants.map((variant) => renderEvolutionVariant(unit, variant)).join("")}</div>`;
}

function renderEvolutionVariant(selectedUnit, variant) {
    const active = variant.kindNum === selectedUnit.kindNum;
    const className = active ? "unit-evolution-link active" : "unit-evolution-link inactive";
    return `<a class="${className}" href="#/units/${variant.kindNum}" title="${escapeHtml(getUnitName(variant))}">${renderUnitPortrait(variant)}</a>`;
}

function getEvolutionVariants(unit) {
    const chain = [];
    let current = unit;
    const visitedBack = new Set();
    while (current && !visitedBack.has(current.kindNum)) {
        visitedBack.add(current.kindNum);
        chain.unshift(current);
        current = state.units.find((candidate) => candidate.evolKindNum === current.kindNum);
    }

    current = unit.evolKindNum > 0 ? state.unitMap.get(unit.evolKindNum) : null;
    const visitedForward = new Set(chain.map((item) => item.kindNum));
    while (current && !visitedForward.has(current.kindNum)) {
        visitedForward.add(current.kindNum);
        chain.push(current);
        current = current.evolKindNum > 0 ? state.unitMap.get(current.evolKindNum) : null;
    }

    return chain.length ? chain : [unit];
}

function renderUnitPortrait(unit) {
    const grade = clampGrade(unit.grade);
    const iconFrame = getUnitIconFrameName(unit.kindNum);
    return `
        <div class="unit-portrait" aria-label="${escapeHtml(getUnitName(unit))}">
            <span class="unit-portrait-layer unit-portrait-frame">${renderAtlasSprite(`HeroFrame${grade}`, {
                label: `${grade}등급 테두리`,
                width: 112,
            })}</span>
            <span class="unit-portrait-crop">
                <span class="unit-portrait-hero">${renderAtlasSprite(iconFrame, {
                    label: getUnitName(unit),
                    width: 96,
                })}</span>
            </span>
            <span class="unit-portrait-layer unit-portrait-cover">${renderAtlasSprite(`HeroCover${grade}`, {
                label: `${grade}등급 덮개`,
                width: 112,
            })}</span>
        </div>
    `;
}

function renderUnitListPortrait(unit) {
    const grade = clampGrade(unit.grade);
    const iconFrame = getUnitIconFrameName(unit.kindNum);
    const name = getUnitName(unit);
    return `
        <span class="unit-list-portrait" aria-label="${escapeHtml(name)}">
            <span class="unit-list-layer">${renderAtlasSprite(`HeroFrame${grade}`, {
                label: `${grade}등급 테두리`,
                width: 92,
            })}</span>
            <span class="unit-list-crop">
                <span class="unit-list-hero">${renderAtlasSprite(iconFrame, {
                    label: name,
                    width: 78,
                })}</span>
            </span>
            <span class="unit-list-layer">${renderAtlasSprite(`HeroCover${grade}`, {
                label: `${grade}등급 덮개`,
                width: 92,
            })}</span>
        </span>
    `;
}

function renderDetailTab(tab) {
    const active = tab === state.selectedTab ? " active" : "";
    return `<button type="button" class="unit-detail-tab${active}" data-unit-tab="${escapeHtml(tab)}">${escapeHtml(formatTabName(tab))}</button>`;
}

function renderSelectedTab(unit) {
    if (state.selectedTab === "skills") return renderSkillsTab(unit);
    if (state.selectedTab === "ascend") return renderAscendTab(unit);
    return renderDetailsTab(unit);
}

function renderDetailsTab(unit) {
    const normalAttack = text(`UNIT_NATK_${unit.kindNum}`, unit.nAtk || "-");
    const skillAttack = text(`UNIT_SATK_${unit.kindNum}`, unit.sAtk || "-");
    const uniqueSkills = getUniqueSkills(unit);

    return `
        <div class="unit-quick-stats">
            ${renderQuickStat("UI_ATTACK_SPEED", "공격속도", formatDisplayAttackSpeed(unit.atkSpd))}
            ${renderQuickStat("UI_MOVE_SPEED", "이동속도", formatDisplayMoveSpeed(unit.moveSpd))}
            ${renderQuickStat("ICON_OPEN", "회복력", `${formatStat(unit.recovery)}%`)}
            ${renderQuickStat("UI_ATTACK_RANGE", "공격거리", formatStat(unit.atkRange))}
        </div>
        <div class="unit-text-panel unit-details-panel">
            <section>
                <h4># 기본 공격</h4>
                <p>${formatMultiline(normalAttack)}</p>
            </section>
            <section>
                <h4># 스킬</h4>
                <p>${formatMultiline(skillAttack)}</p>
            </section>
            <section>
                <h4># 종족 특성</h4>
                <p>${renderRaceTraits(unit)}</p>
            </section>
            ${uniqueSkills.length ? `
                <section class="unit-unique-skill">
                    <h4># 고유스킬</h4>
                    <ul class="unit-unique-skill-list">
                        ${uniqueSkills.map((skill) => `<li>${formatMultiline(skill.desc)}</li>`).join("")}
                    </ul>
                </section>
            ` : ""}
            ${renderCouplePet(unit)}
        </div>
    `;
}

function renderSkillsTab(unit) {
    const rows = unit.goldBuffs.slice(0, GOLD_BUFF_UNLOCK_LEVELS.length).map((skillId, index) => {
        const skill = state.heroGoldSkillMap.get(skillId);
        const label = text(`HERO_GOLD_SKILL_DESC_${skillId}`, skill && skill.desc ? skill.desc : `스킬 ${skillId}`);
        const value = unit.goldBuffValues[index] || 0;
        const skillCode = skill && skill.skillCode ? skill.skillCode : "";
        return `
            <div class="unit-skill-card">
                <div class="unit-skill-card-icon">${renderSkillCardIcon(skillCode)}</div>
                <div class="unit-skill-card-copy">
                    <div class="unit-skill-card-name">${escapeHtml(label)}</div>
                    <div class="unit-skill-card-condition">발동 조건 : Lv.${GOLD_BUFF_UNLOCK_LEVELS[index]}</div>
                </div>
                <div class="unit-skill-card-power">
                    <div>+${escapeHtml(formatStat(value))}%</div>
                    <div>(+${escapeHtml(formatStat(value * 2))}%)</div>
                </div>
            </div>
        `;
    });

    if (!rows.length) return `<div class="unit-text-panel">스킬 정보가 없습니다.</div>`;

    return `
        <div class="unit-text-panel unit-skills-panel">
            ${rows.join("")}
        </div>
    `;
}

function renderAscendTab(unit) {
    const materialGroups = [unit.material1, unit.material2, unit.material3];
    const rows = materialGroups.map((materials, index) => `
        <section class="unit-material-group">
            <h4># ${index + 1}차 초월 재료</h4>
            ${renderMaterialTotal(materials, index)}
            <div class="unit-material-icons">
                ${materials.length ? materials.map((kindNum) => renderMaterialUnit(kindNum)).join("") : "<span>재료 없음</span>"}
            </div>
        </section>
    `);

    return `<div class="unit-text-panel">${rows.join("")}</div>`;
}

function renderMaterialTotal(materials, index) {
    if (!materials.length) return "";

    return `
        <div class="unit-material-total">
            <span>합계</span>
            <span class="unit-honor-cost">${renderAtlasIcon(state.assetAtlases.units, "UI_COIN_Big", {
                label: "명예코인",
                size: 18,
            })}${escapeHtml(formatStat(TRANS_HONOR_COIN_COSTS[index] || 0))}</span>
            <span class="unit-evolution-cost">${renderAtlasIcon(state.assetAtlases.units, "UI_GEM_ICON", {
                label: "보석",
                size: 18,
            })}${escapeHtml(formatStat(totalEvolutionCost(materials)))}</span>
        </div>
    `;
}

function totalEvolutionCost(materials) {
    return materials.reduce((total, kindNum) => {
        const unit = state.unitMap.get(kindNum);
        return total + getEvolutionCost(unit);
    }, 0);
}

function bindDetailTabs(unit) {
    els.detailBody.querySelectorAll("[data-unit-tab]").forEach((button) => {
        button.addEventListener("click", () => {
            state.selectedTab = button.dataset.unitTab;
            els.detailBody.innerHTML = renderGameDetail(unit);
            bindDetailTabs(unit);
        });
    });
}

function getUniqueSkills(unit) {
    return [unit.uniqueSkill, unit.uniqueSkill2]
        .map(Number)
        .filter((skillId) => skillId > 0)
        .map((skillId) => state.heroUniqueSkillMap.get(skillId))
        .filter(Boolean)
        .map((skill) => ({
            desc: text(`HERO_UNIQUE_SKILL_DESC_${skill.kindNum}`, skill.desc || ""),
        }));
}

function renderCouplePet(unit) {
    const pet = state.petByCoupleMap.get(unit.kindNum);
    if (!pet) {
        return `
            <section class="unit-couple-pet empty">
                <h4># 커플 펫</h4>
            </section>
        `;
    }
    const name = text(`PET_NAME_${pet.kindNum}`, pet.className || pet.name || `펫 ${pet.kindNum}`);
    return `
        <section class="unit-couple-pet">
            <h4># 커플 펫</h4>
            <a href="#/pets/${pet.kindNum}" title="${escapeHtml(name)}">${renderAtlasIconById(state.assetAtlases.pets, pet.kindNum, {
                label: name,
                size: 58,
            })}</a>
        </section>
    `;
}

function renderRaceTraits(unit) {
    const traits = [
        unit.stunImmune === "Y" ? "기절 면역" : "",
        unit.freezeImmune === "Y" ? "빙결 면역" : "",
        unit.blowImmune === "Y" ? "블로우 면역" : "",
        unit.knockImmune === "Y" ? "넉백 면역" : "",
    ].filter(Boolean);
    return traits.length ? escapeHtml(traits.join(", ")) : "없음";
}

function renderCoreStat(frameName, value) {
    return `<span class="unit-core-stat">${renderAtlasIcon(state.assetAtlases.units, frameName, {
        label: value,
        size: 18,
    })}<strong>${escapeHtml(value)}</strong></span>`;
}

function renderHeaderBadges(unit) {
    return [
        renderAtlasBadge(tribeIconFrame(unit.tribe), getTribeName(unit.tribe)),
        renderAtlasBadge(genderIconFrame(unit.sex), formatGender(unit.sex)),
        unit.detect === "Y" ? renderAtlasBadge("DETECT_ICON", "은신 감지") : "",
    ].filter(Boolean).join("");
}

function renderQuickStat(frameName, label, value) {
    return `<div class="unit-quick-stat">${renderAtlasIcon(state.assetAtlases.units, frameName, {
        label,
        size: 20,
    })}<strong>${escapeHtml(label)} : ${escapeHtml(value)}</strong></div>`;
}

function renderAtlasBadge(frameName, label) {
    return `<span class="unit-badge" title="${escapeHtml(label)}">${renderAtlasIcon(state.assetAtlases.units, frameName, {
        label,
        size: 18,
    })}</span>`;
}

function genderIconFrame(sex) {
    if (sex === "F") return "FEMALE_ICON";
    if (sex === "N") return "NEUTRAL_ICON";
    return "MALE_ICON";
}

function formatGender(sex) {
    if (sex === "F") return "여성";
    if (sex === "N") return "중성";
    return "남성";
}

function renderSkillIcon(skillCode) {
    const parts = String(skillCode || "").split("_");
    const buffCode = parts.length > 1 ? parts[1] : parts[0];
    return renderAtlasIcon(state.assetAtlases.unitSkills, `Icon_Skill_${buffCode}`, {
        label: skillCode || "스킬",
        className: "unit-skill-icon",
        size: 18,
    });
}

function renderSkillCardIcon(skillCode) {
    const parts = String(skillCode || "").split("_");
    const targetCode = parts.length > 1 ? parts[0] : "";
    const buffCode = parts.length > 1 ? parts[1] : parts[0];
    return `
        <span class="unit-skill-card-icon-stack">
            ${renderAtlasIcon(state.assetAtlases.unitSkills, `Icon_Skill_${buffCode}`, {
                label: skillCode || "스킬",
                size: 80,
            })}
            ${targetCode ? renderAtlasIcon(state.assetAtlases.unitSkills, targetIconFrame(targetCode), {
                label: targetCode,
                className: "unit-skill-target-icon",
                size: 15,
            }) : ""}
        </span>
    `;
}

function targetIconFrame(targetCode) {
    if (targetCode === "T") return "Icon_All";
    if (targetCode === "M") return "Icon_Melee";
    if (targetCode === "R") return "Icon_Range";
    if (targetCode === "A") return "Icon_All";
    if (targetCode === "S") return "Icon_Range";
    return tribeIconFrame(targetCode);
}

function tribeIconFrame(tribe) {
    const tribeCode = typeof tribe === "number"
        ? ({ 1: "H", 2: "E", 3: "U", 4: "O" }[tribe] || "H")
        : String(tribe || "H").charAt(0).toUpperCase();
    if (tribeCode === "E") return "ELF_ICON";
    if (tribeCode === "U") return "UNDEAD_ICON";
    if (tribeCode === "O") return "ORC_ICON";
    return "HUMAN_ICON";
}

function renderMaterialUnit(kindNum) {
    const unit = state.unitMap.get(kindNum);
    const name = unit ? getUnitName(unit) : `영웅 ${kindNum}`;
    return `
        <span class="unit-material-item">
            <a href="#/units/${kindNum}" title="${escapeHtml(name)}">${renderUnitPortraitMini(kindNum, name)}</a>
            ${renderEvolutionCost(unit)}
        </span>
    `;
}

function renderEvolutionCost(unit) {
    const cost = getEvolutionCost(unit);
    return `<span class="unit-evolution-cost">${renderAtlasIcon(state.assetAtlases.units, "UI_GEM_ICON", {
        label: "보석",
        size: 16,
    })}${cost ? escapeHtml(formatStat(cost)) : "-"}</span>`;
}

function getEvolutionCost(unit) {
    return unit ? EVOLUTION_GEM_COSTS_BY_GRADE[unit.grade] || 0 : 0;
}

function renderUnitPortraitMini(kindNum, label) {
    const unit = state.unitMap.get(kindNum);
    const grade = clampGrade(unit ? unit.grade : 1);
    const iconFrame = getUnitIconFrameName(kindNum);
    return `
        <span class="unit-material-portrait">
            <span class="unit-material-layer">${renderAtlasSprite(`HeroFrame${grade}`, {
                label: `${grade}등급 테두리`,
                width: 78,
            })}</span>
            <span class="unit-material-crop">
                <span class="unit-material-hero">${renderAtlasSprite(iconFrame, {
                    label,
                    width: 66,
                })}</span>
            </span>
            <span class="unit-material-layer">${renderAtlasSprite(`HeroCover${grade}`, {
                label: `${grade}등급 덮개`,
                width: 78,
            })}</span>
        </span>
    `;
}

function renderUnitIcon(kindNum, options = {}) {
    return renderAtlasIcon(state.assetAtlases.units, getUnitIconFrameName(kindNum), {
        ...options,
        missingText: options.missingText || kindNum,
    });
}

function writeListRoute() {
    window.location.hash = "#/units";
}

function getTribeName(tribeId) {
    const tribe = TRIBES.find((item) => item.id === tribeId);
    return tribe ? tribe.label : "알 수 없음";
}

function formatUnitType(unit) {
    const type = unit.isAir === "Y" ? "Air" : unit.unitType || "Unknown";
    return type.replace(/^./, (letter) => letter.toUpperCase());
}

function formatDamageType(dmgType) {
    return dmgType === "P" ? "Physical" : "Magical";
}

const TAB_NAMES_KO = {
    details: "상세 정보",
    skills: "스킬",
    ascend: "초월",
};

function formatTabName(tab) {
    return TAB_NAMES_KO[tab] || tab;
}

function renderRarity(grade) {
    const normalizedGrade = Math.min(Math.max(Number(grade) || 1, 1), 7);
    return renderAtlasIcon(state.assetAtlases.units, `UI_UNIT_RARE${String(normalizedGrade).padStart(4, "0")}`, {
        label: `${normalizedGrade}성`,
        size: 72,
    });
}

function renderTribeTabIcon(tribeId, label) {
    return renderAtlasIcon(state.assetAtlases.units, `TRIBE_${Math.max(0, Number(tribeId) - 1)}_Icon`, {
        label,
        className: "unit-tribe-tab-icon",
        size: 38,
    });
}

function formatStat(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return String(value || "-");
    const rounded = Number(number.toFixed(2));
    return Number.isInteger(rounded) ? formatNumber(rounded) : String(rounded);
}

function formatDisplayAttackSpeed(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return "-";
    return (10000 / number / 30).toFixed(1);
}

function formatDisplayMoveSpeed(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "-";
    return (number * 10).toFixed(2);
}

function clampGrade(grade) {
    return Math.min(Math.max(Number(grade) || 1, 1), 6);
}

function getUnitIconFrameName(kindNum) {
    const atlas = state.assetAtlases.units;
    const frames = atlas && atlas.frames ? atlas.frames : {};
    const numericKindNum = Number(kindNum);
    const exact = `Hero${numericKindNum}`;
    if (frames[exact]) return exact;

    const sourceKindNum = findEvolutionSourceKindNum(numericKindNum, frames);
    return sourceKindNum ? `Hero${sourceKindNum}` : exact;
}

function findEvolutionSourceKindNum(kindNum, frames, visited = new Set()) {
    if (visited.has(kindNum)) return null;
    visited.add(kindNum);

    const previousUnit = state.units.find((unit) => unit.evolKindNum === kindNum);
    if (!previousUnit) return null;

    const previousFrame = `Hero${previousUnit.kindNum}`;
    if (frames[previousFrame]) return previousUnit.kindNum;

    return findEvolutionSourceKindNum(previousUnit.kindNum, frames, visited);
}

function renderAtlasSprite(frameName, options = {}) {
    const atlas = state.assetAtlases.units;
    const label = options.label || frameName;
    const className = options.className || "";
    const width = options.width || 48;
    const sprite = atlas && atlas.frames ? atlas.frames[frameName] : null;

    if (!sprite || !atlas.size) {
        const missingStyle = `width:${width}px;height:${width}px`;
        return `<span class="sprite-icon sprite-icon-missing ${escapeHtml(className)}" role="img" aria-label="${escapeHtml(label)}" style="${missingStyle}">${escapeHtml(options.missingText || "?")}</span>`;
    }

    const frame = sprite.frame;
    const sourceSize = sprite.sourceSize || { w: frame.w, h: frame.h };
    const sourceOffset = sprite.spriteSourceSize || { x: 0, y: 0 };
    const scale = width / sourceSize.w;
    const height = sourceSize.h * scale;
    const rotated = Boolean(sprite.rotated);
    const clipWidth = rotated ? sourceOffset.w : frame.w;
    const clipHeight = rotated ? sourceOffset.h : frame.h;
    const packedWidth = rotated ? frame.h : frame.w;
    const packedHeight = rotated ? frame.w : frame.h;
    const outerStyle = [
        `width:${formatCssNumber(width)}px`,
        `height:${formatCssNumber(height)}px`,
    ].join(";");
    const clipStyle = [
        `left:${sourceOffset.x}px`,
        `top:${sourceOffset.y}px`,
        `width:${clipWidth}px`,
        `height:${clipHeight}px`,
    ].join(";");
    const imageStyle = [
        `width:${packedWidth}px`,
        `height:${packedHeight}px`,
        `background-image:url('${atlas.image}')`,
        `background-position:${-frame.x}px ${-frame.y}px`,
        ...(rotated ? [`transform:translateY(${clipHeight}px) rotate(-90deg)`] : []),
    ].join(";");
    const canvasStyle = [
        `width:${sourceSize.w}px`,
        `height:${sourceSize.h}px`,
        "left:0",
        "top:0",
        `transform:scale(${formatCssNumber(scale)})`,
    ].join(";");

    return `<span class="sprite-icon ${escapeHtml(className)}" role="img" aria-label="${escapeHtml(label)}" style="${outerStyle}"><span class="sprite-icon-canvas" style="${canvasStyle}"><span class="sprite-icon-clip" style="${clipStyle}"><span class="sprite-icon-frame" style="${imageStyle}"></span></span></span></span>`;
}

function formatCssNumber(value) {
    return Number(value.toFixed(4));
}

function formatMultiline(value) {
    return escapeHtml(value).replace(/\\n|\n/g, "<br>");
}
