export class CutscenePanel extends Application {
    constructor () {
        super();
        this._editClipIndex = -1;
    }

    static get defaultOptions() {
        return {
            ...super.defaultOptions,
            title: "Cutscene Panel",
            id: "cutscene-panel",
            classes: ["three-canvas-compendium-app-slim"],
            template: `modules/canvas3dcompendium/templates/cutscene-panel.hbs`,
            width: 200,
            height: "auto",
            top: 0,
            left: window.innerWidth - 550,
            resizable: false,
        };
    }

    activateListeners(html) { 
        super.activateListeners(html);
        this.setPosition({
            left: this._editClipIndex == -1 ? window.innerWidth - 550 : window.innerWidth - 650,
            width: this._editClipIndex == -1 ? 200 : 300,
            top: 0,
        });
        html.on("click", "button", (e) => { 
            e.preventDefault();
            const action = e.currentTarget.dataset.action;
            const index = parseInt(e.currentTarget.closest("fieldset.clip")?.dataset?.index ?? -1);
            const keyframeIndex = parseInt(e.currentTarget.closest("li")?.dataset?.index ?? -1);
            if (action == "add-clip") this.createNewClip();
            if (action == "play") this.playCutscene(index);
            if (action == "delete") this.deleteClip(index);
            if (action == "edit") this.editClip(index);
            if (action == "add-keyframe") this.addKeyframe(index);
            if (action == "capture") this.captureKeyframe(index, keyframeIndex);
            if(action == "delete-keyframe") this.deleteKeyframe(index, keyframeIndex);
        });
        html.on("change", "input[name='name']", async (e) => {
            const clipIndex = parseInt(e.currentTarget.closest("fieldset").dataset.index);
            const sceneFlag = canvas.scene.getFlag("levels-3d-preview", "cutscenes") ?? [];
            sceneFlag[clipIndex].name = e.currentTarget.value;
            await canvas.scene.setFlag("levels-3d-preview", "cutscenes", sceneFlag);
            this.render(true);
        });
        html.on("change", ".keyframe", async (e) => {
            const keyframeIndex = parseInt(e.currentTarget.closest("li").dataset.index);
            const clipIndex = parseInt(e.currentTarget.closest("fieldset.clip").dataset.index);
            const keyframeListItem = e.currentTarget.closest("li");
            const time = parseFloat(keyframeListItem.querySelector("input[name='time']").value);
            const hold = parseFloat(keyframeListItem.querySelector("input[name='hold']").value);
            const easing = keyframeListItem.querySelector("select[name='easing']").value;
            const transition = keyframeListItem.querySelector("select[name='transition']").value;
            const sceneFlag = canvas.scene.getFlag("levels-3d-preview", "cutscenes") ?? [];
            sceneFlag[clipIndex].keyframes[keyframeIndex].time = time;
            sceneFlag[clipIndex].keyframes[keyframeIndex].hold = hold;
            sceneFlag[clipIndex].keyframes[keyframeIndex].easing = easing;
            sceneFlag[clipIndex].keyframes[keyframeIndex].transition = transition;
            await canvas.scene.setFlag("levels-3d-preview", "cutscenes", sceneFlag);
            this.render(true);
        });
    }

    async getData() { 
        const sceneFlag = canvas.scene.getFlag("levels-3d-preview", "cutscenes") ?? [];
        sceneFlag.forEach((clip, index) => { 
            clip.editing = index == this._editClipIndex;
        });
        return {
            clips: sceneFlag,
            transitionSelect,
            easingSelect,
        };
    }

    async createNewClip() {
        const clipData = {
            name: "New Clip",
            keyframes: [],
        }
        const sceneFlag = canvas.scene.getFlag("levels-3d-preview", "cutscenes") ?? [];
        sceneFlag.push(clipData);
        this._editClipIndex = sceneFlag.length - 1;
        await canvas.scene.setFlag("levels-3d-preview", "cutscenes", sceneFlag);
        this.render(true);
    }

    async deleteClip(index) { 
        Dialog.confirm({
            title: "Delete Clip",
            content: "Are you sure you want to delete this clip?",
            yes: async () => {
                const sceneFlag = canvas.scene.getFlag("levels-3d-preview", "cutscenes") ?? [];
                sceneFlag.splice(index, 1);
                await canvas.scene.setFlag("levels-3d-preview", "cutscenes", sceneFlag);
                this.render(true);
            },
            no: () => { },
            defaultYes: false,
        });
    }

    async editClip(index) {
        this._editClipIndex = this._editClipIndex == index ? -1 : index;
        this.render(true);
    }

    async addKeyframe(index) { 
        const sceneFlag = canvas.scene.getFlag("levels-3d-preview", "cutscenes") ?? [];
        const clip = sceneFlag[index];
        const captureData = this.getCaptureData();
        const keyframe = {
            time: 0,
            hold: 0,
            easing: "easeInOutQuad",
            transition: "join",
            position: captureData.position,
            target: captureData.target,
        };
        clip.keyframes.push(keyframe);
        await canvas.scene.setFlag("levels-3d-preview", "cutscenes", sceneFlag);
        this.render(true);
    }

    async captureKeyframe(clipIndex, keyframeIndex) {
        const sceneFlag = canvas.scene.getFlag("levels-3d-preview", "cutscenes") ?? [];
        const clip = sceneFlag[clipIndex];
        const keyframe = clip.keyframes[keyframeIndex];
        const captureData = this.getCaptureData();
        keyframe.position = captureData.position;
        keyframe.target = captureData.target;
        await canvas.scene.setFlag("levels-3d-preview", "cutscenes", sceneFlag);
        ui.notifications.info("Camera position captured!");
    }

    getCaptureData() { 
        const cameraPosition = game.Levels3DPreview.camera.position;
        const cameraTarget = game.Levels3DPreview.controls.target;
        return {
            position: {x: cameraPosition.x, y: cameraPosition.y, z: cameraPosition.z},
            target: {x: cameraTarget.x, y: cameraTarget.y, z: cameraTarget.z},
        }
    }

    async deleteKeyframe(clipIndex, keyframeIndex) { 
        Dialog.confirm({
            title: "Delete Keyframe",
            content: "Are you sure you want to delete this keyframe?",
            yes: async () => {
                const sceneFlag = canvas.scene.getFlag("levels-3d-preview", "cutscenes") ?? [];
                sceneFlag[clipIndex].keyframes.splice(keyframeIndex, 1);
                await canvas.scene.setFlag("levels-3d-preview", "cutscenes", sceneFlag);
                this.render(true);
            },
            no: () => { },
            defaultYes: false,
        });
    }

    async playCutscene(index) {
        let dialogHtml = "<p>Are you sure you want to play this cutscene?</p><hr><div style='display: grid; grid-template-columns: 1fr 1fr'>";
        for (let user of Array.from(game.users)) { 
            if (user.active) { 
                dialogHtml += `<label style="display: flex;align-items: center;"><input type="checkbox" name="user" value="${user.id}" checked> ${user.name}</label>`;
            }
        }
        dialogHtml += "</div><hr>";
        const dialog = Dialog.prompt({
            title: "Play Cutscene",
            content: dialogHtml,
            callback: async (html) => {
                const userIds = html.find("input[name='user']").map((i, el) => el.value).get();
                game.Levels3DPreview.cutsceneEngine.playCutscene(index, userIds);
            },
        })        
    }
}

const transitionSelect = {
    "join": "Chain",
    "fade": "Cross-Fade",
}

const easingSelect = {
    linear: "Linear",
    easeInQuad: "Ease In Quad",
    easeOutQuad: "Ease Out Quad",
    easeInOutQuad: "Ease In Out Quad",
    easeInCubic: "Ease In Cubic",
    easeOutCubic: "Ease Out Cubic",
    easeInOutCubic: "Ease In Out Cubic",
}