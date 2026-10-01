import { loadAssetAtlases, renderAtlasIconById } from "./asset-atlas.js?v=e05c1fcbd23b";
import { defaultNavLinks, renderFooter, renderNavbar } from "./layout.js?v=e05c1fcbd23b";
import { initGuildRaidsView, renderGuildRaidsRoute } from "./guild-raids-view.js?v=e05c1fcbd23b";
import { initEmblemsRunesView, renderEmblemsRunesRoute } from "./emblems-runes-view.js?v=e05c1fcbd23b";
import { initPetsView, renderPetsRoute } from "./pets-view.js?v=e05c1fcbd23b";
import { initRelicsView, renderRelicsRoute } from "./relics-view.js?v=e05c1fcbd23b";
import { initUnitsView, renderUnitsRoute } from "./units-view.js?v=e05c1fcbd23b";

(function () {
    "use strict";

    renderFooter();

    function getRouteParts() {
        return (window.location.hash || "")
            .replace(/^#\/?/, "")
            .split("?")[0]
            .split("/")
            .filter(Boolean);
    }

    function normalizeRoute() {
        const parts = getRouteParts();
        const route = parts[0] || "home";

        if (route === "home") {
            history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
            return true;
        }

        if (route !== "relics" && route !== "pets" && route !== "units" && route !== "guild-raids" && route !== "emblems-runes") {
            history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
            return false;
        }

        return true;
    }

    async function renderHome() {
        document.getElementById("homeView").classList.remove("view-hidden");
        document.getElementById("listView").classList.add("view-hidden");
        document.getElementById("detailView").classList.add("view-hidden");
        document.getElementById("unitListView").classList.add("view-hidden");
        document.getElementById("unitDetailView").classList.add("view-hidden");
        document.getElementById("petListView").classList.add("view-hidden");
        document.getElementById("petDetailView").classList.add("view-hidden");
        document.getElementById("guildRaidMainView").classList.add("view-hidden");
        document.getElementById("guildRaidBossListView").classList.add("view-hidden");
        document.getElementById("guildRaidDetailView").classList.add("view-hidden");
        document.getElementById("emblemsRunesView").classList.add("view-hidden");
        renderNavbar({
            links: defaultNavLinks("Home"),
        });
        await renderHomeShowcase();
    }

    async function renderRoute() {
        if (!normalizeRoute()) {
            await renderHome();
            return;
        }

        const parts = getRouteParts();
        const route = parts[0] || "home";

        if (route === "relics") {
            document.getElementById("homeView").classList.add("view-hidden");
            document.getElementById("unitListView").classList.add("view-hidden");
            document.getElementById("unitDetailView").classList.add("view-hidden");
            document.getElementById("petListView").classList.add("view-hidden");
            document.getElementById("petDetailView").classList.add("view-hidden");
            document.getElementById("guildRaidMainView").classList.add("view-hidden");
            document.getElementById("guildRaidBossListView").classList.add("view-hidden");
            document.getElementById("guildRaidDetailView").classList.add("view-hidden");
            document.getElementById("emblemsRunesView").classList.add("view-hidden");
            await initRelicsView();
            renderRelicsRoute();
            return;
        }

        if (route === "pets") {
            document.getElementById("homeView").classList.add("view-hidden");
            document.getElementById("listView").classList.add("view-hidden");
            document.getElementById("detailView").classList.add("view-hidden");
            document.getElementById("unitListView").classList.add("view-hidden");
            document.getElementById("unitDetailView").classList.add("view-hidden");
            document.getElementById("guildRaidMainView").classList.add("view-hidden");
            document.getElementById("guildRaidBossListView").classList.add("view-hidden");
            document.getElementById("guildRaidDetailView").classList.add("view-hidden");
            document.getElementById("emblemsRunesView").classList.add("view-hidden");
            await initPetsView();
            renderPetsRoute();
            return;
        }

        if (route === "units") {
            document.getElementById("homeView").classList.add("view-hidden");
            document.getElementById("listView").classList.add("view-hidden");
            document.getElementById("detailView").classList.add("view-hidden");
            document.getElementById("petListView").classList.add("view-hidden");
            document.getElementById("petDetailView").classList.add("view-hidden");
            document.getElementById("guildRaidMainView").classList.add("view-hidden");
            document.getElementById("guildRaidBossListView").classList.add("view-hidden");
            document.getElementById("guildRaidDetailView").classList.add("view-hidden");
            document.getElementById("emblemsRunesView").classList.add("view-hidden");
            await initUnitsView();
            renderUnitsRoute();
            return;
        }

        if (route === "guild-raids") {
            document.getElementById("homeView").classList.add("view-hidden");
            document.getElementById("listView").classList.add("view-hidden");
            document.getElementById("detailView").classList.add("view-hidden");
            document.getElementById("unitListView").classList.add("view-hidden");
            document.getElementById("unitDetailView").classList.add("view-hidden");
            document.getElementById("petListView").classList.add("view-hidden");
            document.getElementById("petDetailView").classList.add("view-hidden");
            document.getElementById("emblemsRunesView").classList.add("view-hidden");
            await initGuildRaidsView();
            renderGuildRaidsRoute();
            return;
        }

        if (route === "emblems-runes") {
            document.getElementById("homeView").classList.add("view-hidden");
            document.getElementById("listView").classList.add("view-hidden");
            document.getElementById("detailView").classList.add("view-hidden");
            document.getElementById("unitListView").classList.add("view-hidden");
            document.getElementById("unitDetailView").classList.add("view-hidden");
            document.getElementById("petListView").classList.add("view-hidden");
            document.getElementById("petDetailView").classList.add("view-hidden");
            document.getElementById("guildRaidMainView").classList.add("view-hidden");
            document.getElementById("guildRaidBossListView").classList.add("view-hidden");
            document.getElementById("guildRaidDetailView").classList.add("view-hidden");
            await initEmblemsRunesView();
            renderEmblemsRunesRoute();
            return;
        }

        await renderHome();
    }

    async function renderHomeShowcase() {
        const target = document.getElementById("homeRelicShowcase");
        if (!target) return;

        const atlases = await loadAssetAtlases(undefined, ["relics", "units", "pets"]);
        const relicAtlas = atlases.relics;
        const petAtlas = atlases.pets;
        const unitAtlas = atlases.units;
        const iconSize = 72;
        target.innerHTML = [
            renderAtlasIconById(relicAtlas, 89, { label: "유물 아이콘", size: iconSize }),
            renderAtlasIconById(unitAtlas, 69, { label: "영웅 아이콘", size: iconSize }),
            renderAtlasIconById(petAtlas, 5, { label: "펫 아이콘", size: iconSize }),
            renderAtlasIconById(petAtlas, 14, { label: "펫 아이콘", size: iconSize }),
            renderAtlasIconById(relicAtlas, 108, { label: "유물 아이콘", size: iconSize }),
            renderAtlasIconById(unitAtlas, 89, { label: "영웅 아이콘", size: iconSize }),
        ].join("");
    }

    async function init() {
        try {
            await renderRoute();
            window.addEventListener("hashchange", renderRoute);
        } catch (error) {
            const title = document.getElementById("artifactTitle");
            const abilityResults = document.getElementById("abilityResults");
            if (title) title.textContent = "데이터를 불러오지 못했습니다";
            if (abilityResults) abilityResults.textContent = error.message;
        }
    }

    init();
}());
