import { renderAtlasIcon, renderAtlasIconById } from "./asset-atlas.js?v=e05c1fcbd23b";
import { ENHANCEMENT_LEVEL_LIMIT, MATERIAL_ICON_FRAMES, MATERIAL_NAMES } from "./constants.js?v=e05c1fcbd23b";
import { loadRelicData } from "./data.js?v=e05c1fcbd23b";
import { defaultNavLinks, renderNavbar } from "./layout.js?v=e05c1fcbd23b";
import {
    getAbilityId,
    getArtifactSet,
    getHonorAccCost,
    getMaxTrans,
    getNextHonorCost,
    getSetValues,
    getTreasureValue,
    materialCostForLevel,
    setSkillLocale,
    shouldShowSkill2,
    skillLabel,
    totalMaterialCost,
} from "./relic-calculations.js?v=e05c1fcbd23b";
import { clamp, escapeHtml, formatNumber } from "./utils.js?v=e05c1fcbd23b";

const state = {
    treasures: [],
    treasureMap: new Map(),
    valueMap: new Map(),
    sets: [],
    limitBreakAccByGrade: {},
    locale: {},
    assetAtlases: {},
    selectedKindNum: 1,
    grade: 1,
    mode: "images",
    initialized: false,
};

let els;

export async function initRelicsView() {
    if (state.initialized) return;

    els = getElements();
    Object.assign(state, await loadRelicData());
    setSkillLocale(state.locale);
    readRoute();
    bindEvents();
    state.initialized = true;
}

export function renderRelicsRoute() {
    readRoute();
    const parts = getRouteParts();
    if (parts[0] === "relics" && parts[1]) {
        showDetail();
        return;
    }

    showList();
}

function getElements() {
    return {
        listView: document.getElementById("listView"),
        detailView: document.getElementById("detailView"),
        tabs: document.getElementById("gradeTabs"),
        viewModeButtons: Array.from(document.querySelectorAll("[data-view-mode]")),
        content: document.getElementById("artifactContent"),
        title: document.getElementById("artifactTitle"),
        mainIcon: document.getElementById("artifactMainIcon"),
        detailBackLink: document.getElementById("detailBackLink"),
        icons: document.getElementById("setArtifactIcons"),
        form: document.getElementById("calculatorForm"),
        abilityResults: document.getElementById("abilityResults"),
        setTitle: document.getElementById("setTitle"),
        setEffects: document.getElementById("setEffects"),
        materialCostIcons: document.getElementById("materialCostIcons"),
        honorCostIcon: document.getElementById("honorCostIcon"),
        openingCost: document.getElementById("openingCost"),
        nextMaterialCost: document.getElementById("nextMaterialCost"),
        totalMaterialCost: document.getElementById("totalMaterialCost"),
        nextHonorCost: document.getElementById("nextHonorCost"),
        totalHonorCost: document.getElementById("totalHonorCost"),
        trans: document.querySelector("[name='arttranslevel']"),
        enhance: document.querySelector("[name='artenhancelevel']"),
        setLevel: document.querySelector("[name='artsetlevel']"),
    };
}

function text(key, fallback) {
    return state.locale[key] || fallback || key;
}

function getTreasureName(treasure) {
    return text(`TREASURE_NAME_${treasure.kindNum}`, treasure.name);
}

function getSetName(set) {
    return text(`TREASURE_SET_TITLE_${set.kindNum}`, set.title);
}

function formatMaterialList(costs) {
    const groups = new Map();
    costs.forEach((cost, index) => {
        if (cost <= 0) return;
        if (!groups.has(cost)) groups.set(cost, []);
        groups.get(cost).push(index);
    });

    const lines = Array.from(groups.entries()).map(([cost]) => {
        return `<span class="material-line">${formatNumber(cost)}</span>`;
    });
    return lines.length ? lines.join("") : "0";
}

function renderSetIcons(set, treasure) {
    if (!set) {
        els.icons.innerHTML = "";
        return;
    }

    els.icons.innerHTML = set.itemList.map((kindNum) => {
        const item = state.treasureMap.get(kindNum);
        const inactive = kindNum === treasure.kindNum ? "" : " inactive";
        const name = item ? getTreasureName(item) : `유물 ${kindNum}`;
        const icon = renderRelicIcon(kindNum, {
            label: name,
            className: `icon-48 artifact-icon${inactive}`,
            size: 48,
        });
        return `<a href="#/relics/${kindNum}" title="${escapeHtml(name)}">${icon}</a>`;
    }).join("&nbsp;");
}

function renderCalculator() {
    const treasure = state.treasureMap.get(state.selectedKindNum);
    if (!treasure) return;

    const set = getArtifactSet(state.sets, treasure);
    const maxTrans = getMaxTrans(treasure);
    const maxEnhance = ENHANCEMENT_LEVEL_LIMIT;
    const maxSetLevel = 0;

    els.trans.max = String(maxTrans);
    els.enhance.max = String(maxEnhance);
    els.setLevel.max = String(maxSetLevel);

    const trans = clamp(els.trans.value, 0, maxTrans);
    const enhance = clamp(els.enhance.value, 0, maxEnhance);
    const setLevel = clamp(els.setLevel.value, 0, maxSetLevel);

    els.trans.value = trans;
    els.enhance.value = enhance;
    els.setLevel.value = setLevel;

    els.title.textContent = `${getTreasureName(treasure)} ${treasure.grade}*`;
    els.detailBackLink.href = "#/relics";
    els.mainIcon.innerHTML = renderRelicIcon(treasure.kindNum, {
        label: getTreasureName(treasure),
        className: "relic-main-icon-sprite",
        size: 58,
    });
    renderSetIcons(set, treasure);
    renderAbilities(treasure, trans, enhance);
    renderSet(set, setLevel, trans);
    renderCosts(treasure, enhance);
    updateButtons();
}

function renderAbilities(treasure, trans, enhance) {
    const rows = [1, 2]
        .filter((skillIndex) => skillIndex === 1 || shouldShowSkill2(treasure))
        .map((skillIndex) => {
            const abilityId = getAbilityId(treasure, skillIndex, trans);
            const skillCode = skillIndex === 1 ? treasure.skillCode : treasure.skillCode2;
            const value = getTreasureValue(state.valueMap, abilityId, enhance);
            return `<div class="effect-line">+ ${escapeHtml(skillLabel(skillCode))} : ${formatNumber(value)}%</div>`;
        });

    els.abilityResults.classList.remove("loading");
    els.abilityResults.innerHTML = rows.join("");
}

function renderSet(set, setLevel, trans) {
    if (!set) {
        els.setTitle.textContent = "세트 없음";
        els.setEffects.innerHTML = "";
        return;
    }

    els.setTitle.textContent = `${getSetName(set)} +${setLevel} (유물 +${setLevel} 필요)`;
    els.setEffects.innerHTML = set.skillList.map((skills, tierIndex) => {
        const required = set.numSetList[tierIndex] || set.itemList.length;
        const values = getSetValues(set, trans, tierIndex);
        const tierClass = tierIndex === 0 ? "active" : "muted";
        return `<div class="set-tier ${tierClass}">` + [
            `<div class="set-tier-title">세트 효과 ${tierIndex + 1} (${required}/${set.itemList.length})</div>`,
            ...skills.map((skillCode, index) => {
                const value = values[index] || 0;
                return `<div class="effect-line">+ ${escapeHtml(skillLabel(skillCode))} : ${formatNumber(value)}%</div>`;
            }),
        ].join("") + "</div>";
    }).join("");
}

function renderCosts(treasure, enhance) {
    const limitBreakLevel = Math.max(0, enhance - (treasure.maxLv || 20));
    els.materialCostIcons.innerHTML = treasure.openCost
        .map((cost, index) => cost > 0 ? renderAtlasIcon(state.assetAtlases.ui, MATERIAL_ICON_FRAMES[index], {
            label: MATERIAL_NAMES[index],
            className: "icon-h4",
            size: 20,
        }) : "")
        .join("");
    els.honorCostIcon.innerHTML = renderAtlasIcon(state.assetAtlases.ui, "UI_COIN_Big", {
        label: "명예코인",
        className: "icon-h4",
        size: 20,
    });
    els.openingCost.innerHTML = formatMaterialList(treasure.openCost);
    els.nextMaterialCost.innerHTML = formatMaterialList(materialCostForLevel(treasure, enhance));
    els.totalMaterialCost.innerHTML = formatMaterialList(totalMaterialCost(treasure, enhance));
    const nextHonorCost = getNextHonorCost(state.limitBreakAccByGrade, treasure.grade, limitBreakLevel);
    els.nextHonorCost.textContent = nextHonorCost == null ? "N/A" : formatNumber(nextHonorCost);
    els.totalHonorCost.textContent = formatNumber(getHonorAccCost(state.limitBreakAccByGrade, treasure.grade, limitBreakLevel));
}

function readRoute() {
    const parts = getRouteParts();

    if (parts[0] !== "relics") {
        window.location.hash = "#/relics";
        return;
    }

    state.grade = clamp(state.grade || 1, 1, 12);

    const requestedKindNum = Number(parts[1]);
    if (state.treasureMap.has(requestedKindNum)) {
        if (state.selectedKindNum !== requestedKindNum) {
            resetInputs();
        }
        state.selectedKindNum = requestedKindNum;
        state.grade = state.treasureMap.get(requestedKindNum).grade;
    }
}

function getRouteParts() {
    return (window.location.hash || "#/relics")
        .replace(/^#\/?/, "")
        .split("?")[0]
        .split("/")
        .filter(Boolean);
}

function resetInputs() {
    els.trans.value = "0";
    els.enhance.value = "0";
    els.setLevel.value = "0";
}

function showList() {
    els.detailView.classList.add("view-hidden");
    els.listView.classList.remove("view-hidden");
    renderNavbar({
        links: defaultNavLinks("Relics"),
    });
    renderList();
}

function showDetail() {
    els.listView.classList.add("view-hidden");
    els.detailView.classList.remove("view-hidden");
    renderNavbar({
        links: defaultNavLinks("Relics"),
    });
    renderCalculator();
}

function writeListRoute() {
    window.location.hash = "#/relics";
}

function renderList() {
    renderTabs();
    renderToggle();
    renderListContent();
}

function renderTabs() {
    const grades = Array.from(new Set(state.treasures.map((treasure) => treasure.grade)))
        .filter((grade) => grade > 0)
        .sort((a, b) => a - b);

    els.tabs.innerHTML = grades.map((grade) => {
        const active = grade === state.grade ? " class=\"active\"" : "";
        return `<li${active}><a href="#/relics" data-grade="${grade}">${grade}&#9733;</a></li>`;
    }).join("");

    els.tabs.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", (event) => {
            event.preventDefault();
            state.grade = Number(link.dataset.grade);
            writeListRoute();
            renderList();
        });
    });
}

function renderToggle() {
    els.viewModeButtons.forEach((button) => {
        button.classList.toggle("active", button.dataset.viewMode === state.mode);
    });
}

function renderListContent() {
    const treasures = state.treasures.filter((treasure) => treasure.grade === state.grade);
    els.content.classList.toggle("icon-grid", state.mode === "images");
    els.content.classList.toggle("text-list", state.mode === "list");
    if (!treasures.length) {
        els.content.textContent = "이 등급의 유물이 없습니다.";
        return;
    }

    if (state.mode === "list") {
        els.content.innerHTML = renderListTable(treasures);
        return;
    }

    els.content.innerHTML = treasures.map(renderImageItem).join("");
}

function renderImageItem(treasure) {
    const name = getTreasureName(treasure);
    const id = treasure.kindNum;
    return `<a href="#/relics/${id}" title="${escapeHtml(name)}">${renderRelicIcon(id, {
        label: name,
        size: 46,
    })}</a>`;
}

function renderRelicIcon(kindNum, options = {}) {
    return renderAtlasIconById(state.assetAtlases.relics, kindNum, options);
}

function renderListTable(treasures) {
    return `
        <table class="relic-list-table">
            <thead>
                <tr>
                    <th class="id-column">ID</th>
                    <th>세트</th>
                    <th>이름</th>
                </tr>
            </thead>
            <tbody>
                ${treasures.map(renderListRow).join("")}
            </tbody>
        </table>
    `;
}

function renderListRow(treasure) {
    const set = getArtifactSet(state.sets, treasure);
    const setName = set ? getSetName(set) : "";
    return `
        <tr>
            <td class="id-column">${treasure.kindNum}</td>
            <td class="set-column" title="${escapeHtml(setName)}">${escapeHtml(setName)}</td>
            <td class="name-column"><a href="#/relics/${treasure.kindNum}">${escapeHtml(getTreasureName(treasure))}</a></td>
        </tr>
    `;
}

function updateButtons() {
    document.querySelectorAll(".btn-number").forEach((button) => {
        const input = document.querySelector(`[name='${button.dataset.field}']`);
        const value = clamp(input.value, Number(input.min), Number(input.max));
        button.disabled = button.dataset.type === "minus" ? value <= Number(input.min) : value >= Number(input.max);
    });
}

function bindEvents() {
    els.viewModeButtons.forEach((button) => {
        button.addEventListener("click", () => {
            state.mode = button.dataset.viewMode;
            writeListRoute();
            renderList();
        });
    });

    document.querySelectorAll(".btn-number").forEach((button) => {
        button.addEventListener("click", (event) => {
            event.preventDefault();
            const input = document.querySelector(`[name='${button.dataset.field}']`);
            const delta = button.dataset.type === "minus" ? -1 : 1;
            input.value = clamp(Number(input.value) + delta, Number(input.min), Number(input.max));
            renderCalculator();
        });
    });

    document.querySelectorAll(".input-number").forEach((input) => {
        input.addEventListener("input", renderCalculator);
        input.addEventListener("keydown", onlyNumericKeys);
    });

    els.form.addEventListener("submit", (event) => {
        event.preventDefault();
        renderCalculator();
    });
}

function onlyNumericKeys(event) {
    const allowed = ["Backspace", "Delete", "Tab", "Escape", "Enter", "Home", "End", "ArrowLeft", "ArrowRight"];
    if (allowed.includes(event.key) || (event.ctrlKey && event.key.toLowerCase() === "a")) return;
    if (!/^\d$/.test(event.key)) event.preventDefault();
}
