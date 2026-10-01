import { SKILL_LABELS, TARGET_LABELS } from "./constants.js?v=e05c1fcbd23b";
import { clamp } from "./utils.js?v=e05c1fcbd23b";

export function getAbilityId(treasure, skillIndex, trans) {
    if (skillIndex === 1) {
        if (trans === 1) return Number(treasure.ability11 || treasure.ability1 || 0);
        if (trans === 2) return Number(treasure.ability12 || treasure.ability1 || 0);
        if (trans === 3) return Number(treasure.ability13 || treasure.ability1 || 0);
        return Number(treasure.ability1 || 0);
    }

    if (trans === 1) return Number(treasure.ability21 || treasure.ability2 || 0);
    if (trans === 2) return Number(treasure.ability22 || treasure.ability2 || 0);
    if (trans === 3) return Number(treasure.ability23 || treasure.ability2 || 0);
    return Number(treasure.ability2 || 0);
}

export function getTreasureValue(valueMap, abilityId, enhance) {
    const value = valueMap.get(Number(abilityId));
    if (!value) return 0;
    if (value.isPlus === 1) return value.init + value.inc * enhance;
    if (enhance < value.inflaPoint) return value.init * Math.pow(value.inc, enhance);
    return value.init * Math.pow(value.inc, value.inflaPoint) * Math.pow(value.inc2, enhance - value.inflaPoint);
}

export function shouldShowSkill2(treasure) {
    const descParts = treasure.desc ? String(treasure.desc).split("|") : [];
    return descParts.length > 1 && Boolean(treasure.skillCode2);
}

let skillLocale = {};

export function setSkillLocale(locale) {
    skillLocale = locale || {};
}

export function skillLabel(skillCode) {
    if (skillCode && skillLocale[skillCode]) return skillLocale[skillCode];
    const parsed = parseSkillCode(skillCode);
    if (!parsed) return skillCode || "알 수 없는 효과";

    const base = SKILL_LABELS[parsed.buffType] || humanizeSkill(parsed.buffType);
    if (!parsed.target) return base;

    const targets = parsed.target
        .split("")
        .map((target) => TARGET_LABELS[target])
        .filter(Boolean);
    if (!targets.length) return base;
    return `${targets.join(", ")} ${base}`;
}

export function getArtifactSet(sets, treasure) {
    return sets.find((set) => set.itemList.includes(treasure.kindNum)) || null;
}

export function getMaxTrans(treasure) {
    const abilities = [treasure.ability11, treasure.ability12, treasure.ability13].map(Number);
    let max = 0;
    abilities.forEach((ability, index) => {
        if (ability > 0) max = index + 1;
    });
    return max;
}

export function getMaxSetLevel(set) {
    if (!set) return 0;
    let max = 0;
    [set.valueList1, set.valueList2, set.valueList3].forEach((list, index) => {
        if (list.some((tier) => tier.some((value) => value > 0))) max = index + 1;
    });
    return max;
}

export function getSetValues(set, transStage, tierIndex) {
    const lists = [set.valueList, set.valueList1, set.valueList2, set.valueList3];
    for (let level = clamp(transStage, 0, 3); level >= 0; level -= 1) {
        const row = lists[level] && lists[level][tierIndex];
        if (row && row.some((value) => value !== 0)) return row;
    }
    return (set.valueList && set.valueList[tierIndex]) || [];
}

export function materialCostForLevel(treasure, enhance) {
    return treasure.openCost.map((cost) => cost === 0 ? 0 : Math.floor(cost * (treasure.upCost + treasure.upCost * enhance)));
}

export function totalMaterialCost(treasure, enhance) {
    const total = [0, 0, 0, 0];
    for (let level = 0; level < enhance; level += 1) {
        materialCostForLevel(treasure, level).forEach((cost, index) => {
            total[index] += cost;
        });
    }
    return total;
}

export function getHonorAccCost(limitBreakAccByGrade, grade, level) {
    if (grade < 1) return 0;
    const list = limitBreakAccByGrade[grade] || [0];
    if (level <= 0) return 0;

    const cappedLevel = Math.min(level, list.length - 1);
    for (let index = cappedLevel; index >= 0; index -= 1) {
        if (list[index] != null) return list[index];
    }

    return 0;
}

export function getNextHonorCost(limitBreakAccByGrade, grade, current) {
    if (!hasHonorAccCost(limitBreakAccByGrade, grade, current + 1)) return null;
    return getHonorCost(limitBreakAccByGrade, grade, current, current + 1);
}

function parseSkillCode(skillCode) {
    const code = String(skillCode || "");
    const index = code.lastIndexOf("_");
    if (index === -1) return { buffType: code, target: "" };
    if (index === 0) return null;
    const buffType = code.substring(0, index);
    const target = code.substring(index + 1);
    if (!buffType || !target) return null;
    return { buffType, target };
}

function humanizeSkill(value) {
    return String(value || "")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/^./, (letter) => letter.toUpperCase());
}

function hasHonorAccCost(limitBreakAccByGrade, grade, level) {
    if (grade < 1 || level <= 0) return false;
    const list = limitBreakAccByGrade[grade] || [];
    return list[level] != null;
}

function getHonorCost(limitBreakAccByGrade, grade, from, to) {
    return from >= to ? 0 : getHonorAccCost(limitBreakAccByGrade, grade, to) - getHonorAccCost(limitBreakAccByGrade, grade, from);
}
