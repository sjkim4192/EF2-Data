import { renderAtlasIconById } from "./asset-atlas.js?v=e05c1fcbd23b";
import { loadPetData } from "./data.js?v=e05c1fcbd23b";
import { defaultNavLinks, renderNavbar } from "./layout.js?v=e05c1fcbd23b";
import { escapeHtml, formatNumber } from "./utils.js?v=e05c1fcbd23b";

const state = {
    pets: [],
    petMap: new Map(),
    petSkillMap: new Map(),
    units: [],
    unitMap: new Map(),
    locale: {},
    assetAtlases: {},
    selectedKindNum: 1,
    mode: "images",
    initialized: false,
};

const PET_MASTER_SKILL_PLACEHOLDER_ID = 10005;

let els;

export async function initPetsView() {
    if (state.initialized) return;

    els = getElements();
    Object.assign(state, await loadPetData());
    readRoute();
    bindEvents();
    state.initialized = true;
}

export function renderPetsRoute() {
    readRoute();
    const parts = getRouteParts();
    if (parts[0] === "pets" && parts[1]) {
        showDetail();
        return;
    }

    showList();
}

function getElements() {
    return {
        listView: document.getElementById("petListView"),
        detailView: document.getElementById("petDetailView"),
        viewModeButtons: Array.from(document.querySelectorAll("[data-pet-view-mode]")),
        content: document.getElementById("petContent"),
        backLink: document.getElementById("petBackLink"),
        title: document.getElementById("petTitle"),
        meta: document.getElementById("petMeta"),
        mainIcon: document.getElementById("petMainIcon"),
        info: document.getElementById("petInfo"),
        skills: document.getElementById("petSkills"),
    };
}

function text(key, fallback) {
    return state.locale[key] || fallback || key;
}

function getPetName(pet) {
    return text(`PET_NAME_${pet.kindNum}`, pet.className || pet.name || `펫 ${pet.kindNum}`);
}

function getUnitName(kindNum) {
    if (kindNum <= 0) return "";
    const unit = state.unitMap.get(Number(kindNum));
    return text(`UNIT_NAME_${kindNum}`, unit && unit.name ? unit.name : `영웅 ${kindNum}`);
}

function getSkillText(skillId) {
    const skill = state.petSkillMap.get(Number(skillId));
    return text(`PET_${skillId}`, skill && skill.desc ? skill.desc : `펫 스킬 ${skillId}`);
}

function getMasterSkillText(pet, skillId) {
    if (!skillId) return "";
    const coupleName = getUnitName(pet.couple);
    const template = text("GAME_722", "Awakens the hidden special ability of [ ## ].");
    const title = template.replace("##", coupleName);
    const description = state.locale[`PET_${skillId}`] || "";
    const placeholder = state.locale[`PET_${PET_MASTER_SKILL_PLACEHOLDER_ID}`] || "";
    if (!description || (description === placeholder && pet.kindNum !== 5)) return title;
    return `${title}\n${description}`;
}

function readRoute() {
    const parts = getRouteParts();

    if (parts[0] !== "pets") {
        window.location.hash = "#/pets";
        return;
    }

    const requestedKindNum = Number(parts[1]);
    if (state.petMap.has(requestedKindNum)) {
        state.selectedKindNum = requestedKindNum;
    }
}

function getRouteParts() {
    return (window.location.hash || "#/pets")
        .replace(/^#\/?/, "")
        .split("?")[0]
        .split("/")
        .filter(Boolean);
}

function showList() {
    els.detailView.classList.add("view-hidden");
    els.listView.classList.remove("view-hidden");
    renderNavbar({
        links: defaultNavLinks("Pets"),
    });
    renderList();
}

function showDetail() {
    els.listView.classList.add("view-hidden");
    els.detailView.classList.remove("view-hidden");
    renderNavbar({
        links: defaultNavLinks("Pets"),
    });
    renderDetail();
}

function renderList() {
    renderToggle();
    renderListContent();
}

function renderToggle() {
    els.viewModeButtons.forEach((button) => {
        button.classList.toggle("active", button.dataset.petViewMode === state.mode);
    });
}

function renderListContent() {
    const pets = state.pets;
    els.content.classList.toggle("icon-grid", state.mode === "images");
    els.content.classList.toggle("text-list", state.mode === "list");
    if (!pets.length) {
        els.content.textContent = "펫이 없습니다.";
        return;
    }

    els.content.innerHTML = state.mode === "list"
        ? renderListTable(pets)
        : pets.map(renderImageItem).join("");
}

function renderImageItem(pet) {
    const name = getPetName(pet);
    return `<a href="#/pets/${pet.kindNum}" title="${escapeHtml(name)}">${renderPetIcon(pet.kindNum, {
        label: name,
        size: 62,
    })}</a>`;
}

function renderListTable(pets) {
    return `
        <table class="relic-list-table">
            <thead>
                <tr>
                    <th class="id-column">ID</th>
                    <th>이름</th>
                    <th>속성</th>
                    <th>커플 영웅</th>
                </tr>
            </thead>
            <tbody>
                ${pets.map(renderListRow).join("")}
            </tbody>
        </table>
    `;
}

function renderListRow(pet) {
    const name = getPetName(pet);
    const couple = getUnitName(pet.couple);
    return `
        <tr>
            <td class="id-column">${pet.kindNum}</td>
            <td class="name-column"><a href="#/pets/${pet.kindNum}">${escapeHtml(name)}</a></td>
            <td>${escapeHtml(formatType(pet.type))}</td>
            <td class="set-column" title="${escapeHtml(couple)}">${escapeHtml(couple || "-")}</td>
        </tr>
    `;
}

function renderDetail() {
    const pet = state.petMap.get(state.selectedKindNum);
    if (!pet) return;

    els.backLink.href = "#/pets";
    els.title.textContent = getPetName(pet);
    els.meta.textContent = "";
    els.mainIcon.innerHTML = renderPetIcon(pet.kindNum, {
        label: getPetName(pet),
        className: "relic-main-icon-sprite",
        size: 64,
    });
    els.info.innerHTML = renderPetInfo(pet);
    els.skills.innerHTML = renderPetSkills(pet);
}

function renderPetInfo(pet) {
    return [
        `<div class="effect-line">+ 펫 포인트 : ${formatValues(pet.incGoldLevel)}</div>`,
        pet.couple > 0 ? `<div class="effect-line">+ 커플 영웅</div>${renderHeroCoupleLink(pet.couple)}` : "",
    ].filter(Boolean).join("");
}

function renderHeroCoupleLink(kindNum) {
    const unit = state.unitMap.get(Number(kindNum));
    if (!unit) return "";
    const name = getUnitName(kindNum);
    return `
        <a class="pet-hero-couple-link" href="#/units/${unit.kindNum}" title="${escapeHtml(name)}">
            ${renderUnitPortrait(unit)}
        </a>
    `;
}

function renderUnitPortrait(unit) {
    const grade = Math.min(Math.max(Number(unit.grade) || 1, 1), 7);
    const iconFrame = getUnitIconFrameName(unit.kindNum);
    const name = getUnitName(unit.kindNum);
    return `
        <span class="pet-couple-unit-portrait" aria-label="${escapeHtml(name)}">
            <span class="pet-couple-unit-layer">${renderAtlasSprite(`HeroFrame${grade}`, {
                label: `${grade}등급 테두리`,
                width: 92,
            })}</span>
            <span class="pet-couple-unit-crop">
                <span class="pet-couple-unit-hero">${renderAtlasSprite(iconFrame, {
                    label: name,
                    width: 78,
                })}</span>
            </span>
            <span class="pet-couple-unit-layer">${renderAtlasSprite(`HeroCover${grade}`, {
                label: `${grade}등급 덮개`,
                width: 92,
            })}</span>
        </span>
    `;
}

function renderPetSkills(pet) {
    const rows = [
        renderSkillLine("스킬 1", pet.skill1, pet.value1),
        renderSkillLine("스킬 2", pet.skill2, pet.value2),
    ];

    if (pet.masterSkill && pet.couple > 0) {
        const masterSkillText = getMasterSkillText(pet, pet.masterSkill);
        if (masterSkillText) {
            rows.push(`<div class="pet-master-skill"><strong class="pet-skill-label">스킬 3:</strong> ${formatMultiline(masterSkillText)}</div>`);
        }
    } else if (pet.masterSkill && hasNonZeroValue(pet.value3)) {
        rows.push(renderSkillLine("스킬 3", pet.masterSkill, pet.value3));
    }

    return rows.filter(Boolean).join("");
}

function renderSkillLine(label, skillId, values) {
    if (!skillId) return "";
    const skill = state.petSkillMap.get(Number(skillId));
    return `<div class="effect-line"><strong class="pet-skill-label">${escapeHtml(label)}:</strong> ${escapeHtml(getSkillText(skillId))} (${formatValues(values, { percent: Boolean(skill && skill.isPercent) })})</div>`;
}

function renderPetIcon(kindNum, options = {}) {
    return renderAtlasIconById(state.assetAtlases.pets, kindNum, options);
}

function getUnitIconFrameName(kindNum, visited = new Set()) {
    const frameName = `Hero${kindNum}`;
    if (state.assetAtlases.units && state.assetAtlases.units.frames && state.assetAtlases.units.frames[frameName]) return frameName;
    if (visited.has(kindNum)) return frameName;
    visited.add(kindNum);
    const previousUnit = state.units.find((unit) => unit.evolKindNum === kindNum);
    if (previousUnit) return getUnitIconFrameName(previousUnit.kindNum, visited);
    return frameName;
}

function renderAtlasSprite(frameName, options = {}) {
    const atlas = state.assetAtlases.units;
    const label = options.label || frameName;
    const sprite = atlas && atlas.frames ? atlas.frames[frameName] : null;
    const width = options.width || 92;
    if (!sprite || !atlas.size) {
        return `<span class="sprite-icon sprite-icon-missing" role="img" aria-label="${escapeHtml(label)}" style="width:${width}px;height:${width}px">${escapeHtml(options.missingText || "?")}</span>`;
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
    const outerStyle = `width:${formatCssNumber(width)}px;height:${formatCssNumber(height)}px`;
    const canvasStyle = `width:${sourceSize.w}px;height:${sourceSize.h}px;transform:scale(${formatCssNumber(scale)})`;
    const clipStyle = `left:${sourceOffset.x}px;top:${sourceOffset.y}px;width:${clipWidth}px;height:${clipHeight}px`;
    const imageStyle = [
        `width:${packedWidth}px`,
        `height:${packedHeight}px`,
        `background-image:url('${atlas.image}')`,
        `background-position:${-frame.x}px ${-frame.y}px`,
        rotated ? `transform:translateY(${clipHeight}px) rotate(-90deg)` : "",
    ].filter(Boolean).join(";");

    return `<span class="sprite-icon" role="img" aria-label="${escapeHtml(label)}" style="${outerStyle}"><span class="sprite-icon-canvas" style="${canvasStyle}"><span class="sprite-icon-clip" style="${clipStyle}"><span class="sprite-icon-frame" style="${imageStyle}"></span></span></span></span>`;
}

function formatCssNumber(value) {
    return Number(value.toFixed(4));
}

function writeListRoute() {
    window.location.hash = "#/pets";
}

function bindEvents() {
    els.viewModeButtons.forEach((button) => {
        button.addEventListener("click", () => {
            state.mode = button.dataset.petViewMode;
            writeListRoute();
            renderList();
        });
    });
}

const PET_TYPES_KO = {
    neutral: "무속성",
    wind: "바람",
    fire: "불",
    ground: "땅",
    light: "빛",
    dark: "어둠",
    water: "물",
};

function formatType(type) {
    return PET_TYPES_KO[type] || String(type || "알 수 없음");
}

function formatValues(values, options = {}) {
    const suffix = options.percent ? "%" : "";
    return values.map((value) => `${formatPetValue(value)}${suffix}`).join(", ");
}

function hasNonZeroValue(values) {
    return values.some((value) => Number(value) !== 0);
}

function formatPetValue(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return String(value);
    if (Math.abs(number) >= 10000) return formatNumber(number);
    return Number.isInteger(number) ? String(number) : String(number);
}

function formatMultiline(value) {
    return escapeHtml(value).replace(/\\n|\n/g, "<br>");
}
