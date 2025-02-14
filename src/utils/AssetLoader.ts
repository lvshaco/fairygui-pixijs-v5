namespace fgui.utils {
    
        export class AssetLoader extends PIXI.Loader {
            protected static $resources:PIXI.IResourceDictionary = {};

            public constructor(baseUrl?:string, concurrency?:number) {
                super(baseUrl, concurrency);
            }

            protected _onComplete():void {
                AssetLoader.addResources(this.resources);
                this.onComplete.dispatch();
            };

            public static get resourcesPool():PIXI.IResourceDictionary {
                return AssetLoader.$resources;
            }

            public static destroyResource(key:string):void {
                let res = AssetLoader.$resources[key];
                if(res) {
                    if(!res.isComplete)
                        res.abort();
                    res.children = null;
                    res.data = null;
                    res.texture && res.texture.destroy();
                    res.textures = null;
                    res.xhr = null;

                    AssetLoader.$resources[key] = null;
                    delete AssetLoader.$resources[key];
                }
            }

            public static addResources(res:PIXI.IResourceDictionary):void {
                if(!res) return;
                for(let key in res)   //override the item which has same key name
                    AssetLoader.$resources[key] = res[key];
            }
        }
    }