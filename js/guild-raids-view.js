import { renderAtlasIcon, renderAtlasIconById } from "./asset-atlas.js?v=e05c1fcbd23b";
import { loadGuildRaidData } from "./data.js?v=e05c1fcbd23b";
import { defaultNavLinks, renderNavbar } from "./layout.js?v=e05c1fcbd23b";
import { escapeHtml, formatNumber } from "./utils.js?v=e05c1fcbd23b";

const RAID_COUNT = 5;
const WEAKPOINTS = [
    ["vulnStun", "Buff_Stun.png", "GAME_1388", "Stun"],
    ["vulnFreeze", "Buff_Freeze.png", "GAME_1389", "Frost"],
    ["vulnPoison", "Buff_Poison.png", "GAME_1390", "Poison"],
    ["vulnCurse", "Buff_Curse.png", "GAME_1391", "Curse"],
    ["vulnSilence", "Buff_Silence.png", "GAME_1392", "Silence"],
    ["vulnShock", "Buff_Shock.png", "GAME_1393", "Shock"],
    ["vulnBinding", "Buff_Binding.png", "GAME_1394", "Bind"],
    ["vulnBlow", "Buff_Blow.png", "GAME_1395", "Blow"],
    ["vulnKnockback", "Buff_Knockback.png", "GAME_1396", "Knockback"],
    ["vulnCharm", "Buff_Charm.png", "GAME_1397", "Charm"],
];
const RESIST_TYPES = {
    1: "모래",
    2: "화염",
    3: "독",
    4: "어둠",
    5: "얼음",
};

const state = {
    raids: [],
    units: [],
    raidsByMain: new Map(),
    locale: {},
    assetAtlases: {},
    selectedMain: 1,
    selectedDifficulty: 1,
    selectedSub: 1,
    initialized: false,
};

let els;

export async function initGuildRaidsView() {
    if (state.initialized) return;

    els = getElements();
    const data = await loadGuildRaidData();
    state.raids = data.raids;
    state.units = data.units;
    state.locale = data.locale;
    state.assetAtlases = data.assetAtlases;
    buildIndexes();
    state.initialized = true;
}

export function renderGuildRaidsRoute() {
    if (!readRoute()) return;

    const parts = getRouteParts();
    if (parts.length === 2) {
        showMainView();
    } else if (parts.length === 3) {
        showBossListView();
    } else {
        showDetailView();
    }
}

function getElements() {
    return {
        mainView: document.getElementById("guildRaidMainView"),
        bossListView: document.getElementById("guildRaidBossListView"),
        detailView: document.getElementById("guildRaidDetailView"),
        mainTabs: document.getElementById("guildRaidMainTabs"),
        mainTitle: document.getElementById("guildRaidMainTitle"),
        difficultyList: document.getElementById("guildRaidDifficultyList"),
        bossListBack: document.getElementById("guildRaidBossListBack"),
        bossListTitle: document.getElementById("guildRaidBossListTitle"),
        bossList: document.getElementById("guildRaidBossList"),
        detailBack: document.getElementById("guildRaidDetailBack"),
        detailTitle: document.getElementById("guildRaidDetailTitle"),
        detailMeta: document.getElementById("guildRaidDetailMeta"),
        detailIcon: document.getElementById("guildRaidDetailIcon"),
        detailNavigation: document.getElementById("guildRaidDetailNavigation"),
        detailContent: document.getElementById("guildRaidDetailContent"),
    };
}

function buildIndexes() {
    state.raids.forEach((raid) => {
        if (!state.raidsByMain.has(raid.main)) state.raidsByMain.set(raid.main, new Map());
        const difficulties = state.raidsByMain.get(raid.main);
        if (!difficulties.has(raid.difficult)) difficulties.set(raid.difficult, []);
        difficulties.get(raid.difficult).push(raid);
    });
}

function readRoute() {
    const parts = getRouteParts();
    const defaultMain = getAvailableMains()[0] || 1;
    const main = Number(parts[1]);
    const difficulties = state.raidsByMain.get(main);

    if (parts[0] !== "guild-raids" || !parts[1] || !difficulties) {
        writeRoute(defaultMain);
        return false;
    }

    const difficulty = Number(parts[2]);
    const rows = difficulties.get(difficulty);
    if (parts.length > 2 && (!parts[2] || !rows)) {
        writeRoute(main);
        return false;
    }

    const sub = Number(parts[3]);
    if (parts.length > 3 && (!parts[3] || !rows.some((raid) => raid.sub === sub))) {
        writeRoute(main);
        return false;
    }

    if (parts.length > 4) {
        writeRoute(main);
        return false;
    }

    state.selectedMain = main;
    state.selectedDifficulty = difficulty || getDifficulties(main)[0].difficult;
    state.selectedSub = sub || 0;
    return true;
}

function getRouteParts() {
    return (window.location.hash || "")
        .replace(/^#\/?/, "")
        .split("?")[0]
        .split("/")
        .filter(Boolean);
}

function writeRoute(main, difficulty, sub) {
    const parts = ["#/guild-raids", main];
    if (difficulty) parts.push(difficulty);
    if (sub) parts.push(sub);
    const route = parts.join("/");
    if (window.location.hash !== route) window.location.hash = route;
}

function getAvailableMains() {
    return Array.from(state.raidsByMain.keys()).sort((a, b) => a - b);
}

function getDifficulties(main) {
    return Array.from(state.raidsByMain.get(main).values())
        .sort((a, b) => a[0].difficult - b[0].difficult);
}

function getBosses(main, difficulty) {
    return (state.raidsByMain.get(main).get(difficulty) || [])
        .slice()
        .sort((a, b) => a.sub - b.sub);
}

function text(key, fallback) {
    return state.locale[key] || fallback;
}

function getMainName(main) {
    return text(`GAME_${1260 + main}`, `레이드 ${main}`);
}

function getBossName(raid) {
    return text(`UNIT_NAME_${raid.bossKindNum}`, `보스 ${raid.sub}`);
}

function showMainView() {
    hideOtherViews(els.mainView);
    renderNavbar({ links: defaultNavLinks("Guild Raids") });
    els.mainTabs.innerHTML = renderMainTabs();
    els.mainTitle.textContent = getMainName(state.selectedMain);
    els.difficultyList.innerHTML = getDifficulties(state.selectedMain).map(renderDifficulty).join("");
}

function showBossListView() {
    hideOtherViews(els.bossListView);
    renderNavbar({ links: defaultNavLinks("Guild Raids") });
    els.bossListBack.href = `#/guild-raids/${state.selectedMain}`;
    els.bossListTitle.textContent = `${getMainName(state.selectedMain)} - ${state.selectedDifficulty}단계`;
    els.bossList.innerHTML = getBosses(state.selectedMain, state.selectedDifficulty).map(renderBossListItem).join("");
}

function showDetailView() {
    const boss = getBosses(state.selectedMain, state.selectedDifficulty)
        .find((raid) => raid.sub === state.selectedSub);
    if (!boss) {
        writeRoute(state.selectedMain);
        return;
    }

    hideOtherViews(els.detailView);
    renderNavbar({ links: defaultNavLinks("Guild Raids") });
    els.detailBack.href = `#/guild-raids/${state.selectedMain}/${state.selectedDifficulty}`;
    els.detailTitle.textContent = getBossName(boss);
    els.detailMeta.textContent = `${getMainName(boss.main)} / ${boss.difficult}단계 / 보스 ${boss.sub} / Lv. ${boss.level} / 체력 ${formatNumber(boss.hp)}`;
    els.detailIcon.innerHTML = renderBossIcon(boss, 106, "relic-main-icon-sprite");
    els.detailNavigation.innerHTML = renderBossNavigation(boss);
    els.detailContent.innerHTML = renderBossDetail(boss);
}

function hideOtherViews(currentView) {
    [els.mainView, els.bossListView, els.detailView].forEach((view) => {
        view.classList.toggle("view-hidden", view !== currentView);
    });
}

function renderMainTabs() {
    return Array.from({ length: RAID_COUNT }, (_, index) => {
        const main = index + 1;
        const available = state.raidsByMain.has(main);
        const active = main === state.selectedMain ? " class=\"active\"" : "";
        if (!available) {
            return `<li class="disabled"><span aria-disabled="true">레이드 ${main}</span></li>`;
        }
        return `<li${active}><a href="#/guild-raids/${main}">레이드 ${main}</a></li>`;
    }).join("");
}

function renderDifficulty(rows) {
    const raid = rows[0];
    const href = `#/guild-raids/${raid.main}/${raid.difficult}`;
    return `
        <a class="guild-raid-difficulty" href="${href}">
            <span class="guild-raid-stage-icon">${renderRaidIcon(`Raid${raid.main}_Main.png`, getMainName(raid.main), 112)}</span>
            <span class="guild-raid-stage-copy"><strong>${raid.difficult}단계</strong><small>보스 ${rows.length}마리 / ${raid.limit}시간</small></span>
            <span class="guild-raid-stage-cost">오픈 비용 <strong>${formatNumber(raid.openCost)}</strong></span>
        </a>
    `;
}

function renderBossListItem(raid) {
    const name = getBossName(raid);
    return `
        <a class="guild-raid-boss-row" href="#/guild-raids/${raid.main}/${raid.difficult}/${raid.sub}">
            <span class="guild-raid-boss-portrait">${renderBossIcon(raid, 101)}</span>
            <span>${escapeHtml(name)}</span>
        </a>
    `;
}

function renderBossNavigation(boss) {
    const bosses = getBosses(boss.main, boss.difficult);
    const position = bosses.findIndex((raid) => raid.sub === boss.sub);
    const previous = bosses[position - 1];
    const next = bosses[position + 1];
    const base = `#/guild-raids/${boss.main}/${boss.difficult}`;
    return [
        previous ? `<a href="${base}/${previous.sub}">이전 보스</a>` : "<span>이전 보스</span>",
        next ? `<a href="${base}/${next.sub}">다음 보스</a>` : "<span>다음 보스</span>",
    ].join("");
}

function renderBossDetail(raid) {
    return [
        renderPanel("보상", renderRewards(raid)),
        renderPanel(text("GAME_1377", "Attack Patterns"), renderAttackPatterns(raid)),
        renderPanel(text("GAME_1379", "Race Matchup"), renderTribeEffects(raid)),
        renderPanel(text("GAME_1382", "Elemental Resistance"), renderElementalEffects(raid)),
        renderPanel(text("GAME_1385", "Vulnerable Elements"), renderWeakpoints(raid)),
        renderPanel("레이드 규칙", renderRaidRules(raid)),
    ].join("");
}

function renderPanel(title, content) {
    return `<section class="relic-panel guild-raid-panel"><h4>${escapeHtml(title)}</h4>${content}</section>`;
}

function renderPetFragments(raid) {
    const fragments = [
        [raid.petKindNum, raid.numPet],
        [raid.petKindNum2, raid.numPet2],
    ].filter(([kindNum, count]) => kindNum > 0 && count > 0);
    if (!fragments.length) return "<div class=\"effect-line\">없음</div>";
    return `<div class="guild-raid-pets">${fragments.map(([kindNum, count]) => {
        const name = text(`PET_NAME_${kindNum}`, `펫 ${kindNum}`);
        return `<a href="#/pets/${kindNum}" title="${escapeHtml(name)}">${renderAtlasIconById(state.assetAtlases.pets, kindNum, { label: name, size: 44 })}<span>${escapeHtml(name)} &times; ${count}</span></a>`;
    }).join("")}</div>`;
}

function renderTribeEffects(raid) {
    const effects = [
        [raid.plusTribe, raid.plusValue, "유리"],
        [raid.minusTribe, -raid.minusValue, "불리"],
    ].filter(([tribe, value]) => tribe && value);
    return effects.length
        ? `<div class="guild-raid-tribes">${effects.map(([tribe, value, label]) => `
            <div class="guild-raid-tribe-effect" title="${escapeHtml(formatTribe(tribe))} ${label}: ${formatSignedPercent(value)}">
                ${renderTribeIcon(tribe, 28)}
                <strong class="${value > 0 ? "positive" : "negative"}">${formatSignedPercent(value)}</strong>
            </div>
        `).join("")}</div>`
        : "<div class=\"effect-line\">없음</div>";
}

function renderRangeEffects(raid) {
    const effects = [
        raid.meleeDef ? `<div class="effect-line">근거리 피해 ${formatSignedPercent(-raid.meleeDef)}</div>` : "",
        raid.rangeDef ? `<div class="effect-line">원거리 피해 ${formatSignedPercent(-raid.rangeDef)}</div>` : "",
    ].filter(Boolean);
    return effects.join("") || "<div class=\"effect-line\">없음</div>";
}

function renderElementalEffects(raid) {
    const type = RESIST_TYPES[raid.resistType] || "없음";
    if (!raid.resistType) return "<div class=\"effect-line\">없음</div>";
    const recommendation = raid.showRecommend === "Y"
        ? `<div class="effect-line"><strong>추천 ${type}저항: ${raid.recommendResist}</strong></div>`
        : "";
    return `
        <div class="effect-line">이 보스는 ${type} 속성 공격을 사용합니다. ${type}저항이 높을수록 받는 피해가 줄어듭니다.</div>
        ${recommendation}
        <div class="effect-line">주는 피해: 저항 ${raid.dealResistMin} ~ ${raid.dealResistMax} (${formatMultiplier(raid.dealMultMin)} ~ ${formatMultiplier(raid.dealMultMax)})</div>
        <div class="effect-line">받는 피해: 저항 ${raid.takenResistMin} ~ ${raid.takenResistMax} (${formatMultiplier(raid.takenMultMin)} ~ ${formatMultiplier(raid.takenMultMax)})</div>
    `;
}

function renderRewards(raid) {
    return `
        <div class="guild-raid-rewards-grid">
            <div class="guild-raid-reward-group guild-raid-any-attack">
                <strong>공격 참여</strong>
                <div class="guild-raid-currency-rewards single">${renderCurrencyReward("GUILD_COIN", "길드코인", raid.guildCoin)}</div>
            </div>
            <div class="guild-raid-reward-group">
                <strong>보스 처치</strong>
                <div class="guild-raid-currency-rewards">
                    ${renderCurrencyReward("RaidCoin_on", "레이드 코인", raid.raidCoin)}
                    ${renderCurrencyReward("GUILD_COIN", "길드코인", raid.claimGuildCoin)}
                    ${renderCurrencyReward("UI_GEM_ICON", "보석", raid.gem)}
                </div>
            </div>
            <div class="guild-raid-reward-group">
                <strong>펫조각</strong>
                ${renderPetFragments(raid)}
            </div>
        </div>
    `;
}

function renderCurrencyReward(frameName, label, value) {
    const nativeSize = {
        RaidCoin_on: 29,
        GUILD_COIN: 29,
        UI_GEM_ICON: 27,
    }[frameName] || 28;
    return `<span class="guild-raid-currency-reward" title="${escapeHtml(label)}: ${value}">${renderAtlasIcon(state.assetAtlases.ui, frameName, { label, size: nativeSize, missingText: "?" })}<strong>${value}</strong></span>`;
}

function renderWeakpoints(raid) {
    const maximum = raid.maxPerWeakpoint || 20;
    const weakpoints = WEAKPOINTS
        .filter(([field]) => raid[field] > 0)
        .map(([field, frameName, localeKey, fallback]) => {
            const label = text(localeKey, fallback);
            return `
                <div class="guild-raid-weakpoint">
                    ${renderRaidIcon(frameName, label, 42, "guild-raid-weakpoint-icon")}
                    <div>
                        <div class="guild-raid-weakpoint-title"><strong>${escapeHtml(label)}</strong><span>- 공격 명중당 받는 피해 +${raid[field]}% 중첩</span></div>
                        ${renderVulnerabilityUnits(field)}
                    </div>
                </div>
            `;
        });
    if (!weakpoints.length) return "<div class=\"effect-line\">없음</div>";
    return `<div class="guild-raid-weakpoint-note">보스는 모든 상태이상에 면역이지만, 아래 속성의 공격이 명중할 때마다 받는 피해가 중첩됩니다. (속성당 최대 +${maximum}%)</div><div class="guild-raid-weakpoints">${weakpoints.join("")}</div>`;
}

function renderRaidRules(raid) {
    return [
        renderRangeEffects(raid),
        raid.shield ? `<div class="effect-line">보호막: ${raid.shield}</div>` : "",
        raid.incAttack ? `<div class="effect-line">보스 공격력 증가: ${formatSignedPercent(raid.incAttack * 100)}</div>` : "",
        raid.decSpeed ? `<div class="effect-line">아군 속도 감소: ${formatSignedPercent(-raid.decSpeed * 100)}</div>` : "",
        `<div class="effect-line">석궁: ${raid.hasCrossbow === "N" ? "사용 불가" : "사용 가능"}</div>`,
        `<div class="effect-line">후방공격: ${raid.backAttack === "N" ? "없음" : "있음"}</div>`,
    ].filter(Boolean).join("");
}

function renderAttackPatterns(raid) {
    const bossNumber = Number(raid.bossKindNum) - 99999;
    const patterns = [];
    for (let index = 1; index <= 10; index += 1) {
        const value = state.locale[`RaidBoss${bossNumber}_${index}`];
        if (value) patterns.push(value);
    }
    if (!patterns.length) return `<div class="effect-line">${escapeHtml(text("GAME_1378", "No boss information available."))}</div>`;
    return `<ul class="guild-raid-attack-patterns">${patterns.map((pattern) => `<li>${escapeHtml(normalizeAttackPattern(pattern))}</li>`).join("")}</ul>`;
}

function renderBossIcon(raid, size, className = "") {
    const atlas = state.assetAtlases.raids;
    const frameName = `MRaid${raid.main}_${raid.sub}_on.png`;
    if (atlas && atlas.frames && atlas.frames[frameName]) {
        return renderAtlasIcon(atlas, frameName, { label: getBossName(raid), size, className, missingText: "?" });
    }
    return renderAtlasIcon(state.assetAtlases.ui, "Icon_Boss", {
        label: getBossName(raid),
        size,
        className,
        missingText: "?",
    });
}

function renderRaidIcon(frameName, label, size, className = "", fallbackFrame = "RaidPortal.png") {
    const atlas = state.assetAtlases.raids;
    const resolvedFrame = atlas && atlas.frames && atlas.frames[frameName]
        ? frameName
        : fallbackFrame;
    return renderAtlasIcon(atlas, resolvedFrame, { label, size, className, missingText: "?" });
}

function renderTribeIcon(tribe, size) {
    const frameName = {
        human: "HUMAN_ICON",
        elf: "ELF_ICON",
        undead: "UNDEAD_ICON",
        orc: "ORC_ICON",
    }[tribe];
    return renderAtlasIcon(state.assetAtlases.ui, frameName || "Icon_Boss", {
        label: formatTribe(tribe),
        size,
        missingText: "?",
    });
}

function renderVulnerabilityUnits(field) {
    const cc = field.replace(/^vuln/, "").toLowerCase();
    const units = state.units
        .filter((unit) => unit.tribe >= 1 && unit.tribe <= 4)
        .filter((unit) => unit.evolStage === 0)
        .filter((unit) => String(unit.raidCc || "").toLowerCase().split("|").includes(cc))
        .sort((a, b) => a.kindNum - b.kindNum);
    if (!units.length) return "";

    return `<div class="guild-raid-vulnerability-units">${units.map((unit) => {
        const name = text(`UNIT_NAME_${unit.kindNum}`, unit.name || `영웅 ${unit.kindNum}`);
        return `<a href="#/units/${unit.kindNum}" title="${escapeHtml(name)}">${renderVulnerabilityUnitIcon(unit, name)}</a>`;
    }).join("")}</div>`;
}

function renderVulnerabilityUnitIcon(unit, label) {
    const grade = Math.min(Math.max(Number(unit.grade) || 1, 1), 6);
    const frameName = getUnitIconFrameName(unit.kindNum);
    return `
        <span class="guild-raid-unit-portrait" aria-label="${escapeHtml(label)}">
            <span class="guild-raid-unit-layer">${renderAtlasSprite(`HeroFrame${grade}`, { label: `${grade}등급 테두리`, width: 42 })}</span>
            <span class="guild-raid-unit-crop"><span class="guild-raid-unit-hero">${renderAtlasSprite(frameName, { label, width: 36, missingText: unit.kindNum })}</span></span>
            <span class="guild-raid-unit-layer">${renderAtlasSprite(`HeroCover${grade}`, { label: `${grade}등급 덮개`, width: 42 })}</span>
        </span>
    `;
}

function getUnitIconFrameName(kindNum, visited = new Set()) {
    const frameName = `Hero${kindNum}`;
    const atlas = state.assetAtlases.ui;
    if (atlas && atlas.frames && atlas.frames[frameName]) return frameName;
    if (visited.has(kindNum)) return frameName;

    visited.add(kindNum);
    const previousUnit = state.units.find((unit) => unit.evolKindNum === kindNum);
    return previousUnit ? getUnitIconFrameName(previousUnit.kindNum, visited) : frameName;
}

function renderAtlasSprite(frameName, options = {}) {
    const atlas = state.assetAtlases.ui;
    const label = options.label || frameName;
    const width = options.width || 42;
    const sprite = atlas && atlas.frames ? atlas.frames[frameName] : null;
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
    const canvasStyle = `width:${sourceSize.w}px;height:${sourceSize.h}px;left:0;top:0;transform:scale(${formatCssNumber(scale)})`;
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

const TRIBE_NAMES_KO = {
    human: "휴먼",
    elf: "엘프",
    undead: "언데드",
    orc: "오크",
};

function formatTribe(tribe) {
    return TRIBE_NAMES_KO[String(tribe).toLowerCase()] || String(tribe);
}

function formatSignedPercent(value) {
    const number = Number(value) || 0;
    return `${number > 0 ? "+" : ""}${number}%`;
}

function formatMultiplier(value) {
    return `${value}&times;`;
}

function normalizeAttackPattern(value) {
    return String(value).replace(/\s+(?:\u2014|\u00e2\u20ac\u201d)\s+/g, " - ");
}

function formatCssNumber(value) {
    return Number(value.toFixed(4));
}
