
module fgui {

    export class GSlider extends GComponent {
        private _min: number = 0;
        private _max: number = 0;
        private _value: number = 0;
        private _titleType: ProgressTitleType;
        private _reverse: boolean;
        private _wholeNumbers: boolean;

        private _titleObject: GTextField;
        private _barObjectH: GObject;
        private _barObjectV: GObject;
        private _barMaxWidth: number = 0;
        private _barMaxHeight: number = 0;
        private _barMaxWidthDelta: number = 0;
        private _barMaxHeightDelta: number = 0;
        private _gripObject: GObject;
        private _clickPos: egret.Point;
        private _clickPercent: number = 0;
        private _barStartX: number = 0;
        private _barStartY: number = 0;

        public changeOnClick: boolean = true;
        public canDrag: boolean = true;

        public constructor() {
            super();

            this._titleType = ProgressTitleType.Percent;
            this._value = 50;
            this._max = 100;
            this._clickPos = new egret.Point();
        }

        public get titleType(): ProgressTitleType {
            return this._titleType;
        }

        public set titleType(value: ProgressTitleType) {
            this._titleType = value;
        }

        public get wholeNumbers(): boolean {
            return this._wholeNumbers;
        }

        public set wholeNumbers(value: boolean) {
            if (this._wholeNumbers != value) {
                this._wholeNumbers = value;
                this.update();
            }
        }

        public get min(): number {
            return this._min;
        }

        public set min(value: number) {
            if (this._min != value) {
                this._min = value;
                this.update();
            }
        }

        public get max(): number {
            return this._max;
        }

        public set max(value: number) {
            if (this._max != value) {
                this._max = value;
                this.update();
            }
        }

        public get value(): number {
            return this._value;
        }

        public set value(value: number) {
            if (this._value != value) {
                this._value = value;
                this.update();
            }
        }

        public update(): void {
            this.updateWithPercent((this._value - this._min) / (this._max - this._min));
        }

        private updateWithPercent(percent: number, manual?: boolean): void {
            percent = ToolSet.clamp01(percent);
            if (manual) {
                var newValue: number = ToolSet.clamp(this._min + (this._max - this._min) * percent, this._min, this._max);
                if (this._wholeNumbers) {
                    newValue = Math.round(newValue);
                    percent = ToolSet.clamp01((newValue - this._min) / (this._max - this._min));
                }

                if (newValue != this._value) {
                    this._value = newValue;
                    this.dispatchEvent(new StateChangeEvent(StateChangeEvent.CHANGED));
                }
            }

            if (this._titleObject) {
                switch (this._titleType) {
                    case ProgressTitleType.Percent:
                        this._titleObject.text = Math.floor(percent * 100) + "%";
                        break;

                    case ProgressTitleType.ValueAndMax:
                        this._titleObject.text = this._value + "/" + this._max;
                        break;

                    case ProgressTitleType.Value:
                        this._titleObject.text = "" + this._value;
                        break;

                    case ProgressTitleType.Max:
                        this._titleObject.text = "" + this._max;
                        break;
                }
            }

            var fullWidth: number = this.width - this._barMaxWidthDelta;
            var fullHeight: number = this.height - this._barMaxHeightDelta;
            if (!this._reverse) {
                if (this._barObjectH)
                    this._barObjectH.width = Math.round(fullWidth * percent);
                if (this._barObjectV)
                    this._barObjectV.height = Math.round(fullHeight * percent);
            }
            else {
                if (this._barObjectH) {
                    this._barObjectH.width = Math.round(fullWidth * percent);
                    this._barObjectH.x = this._barStartX + (fullWidth - this._barObjectH.width);
                }
                if (this._barObjectV) {
                    this._barObjectV.height = Math.round(fullHeight * percent);
                    this._barObjectV.y = this._barStartY + (fullHeight - this._barObjectV.height);
                }
            }
        }

        protected constructExtension(buffer: ByteBuffer): void {
            buffer.seek(0, 6);

            this._titleType = buffer.readByte();
            this._reverse = buffer.readBool();
            if (buffer.version >= 2) {
                this._wholeNumbers = buffer.readBool();
                this.changeOnClick = buffer.readBool();
            }

            this._titleObject = <GTextField><any>(this.getChild("title"));
            this._barObjectH = this.getChild("bar");
            this._barObjectV = this.getChild("bar_v");
            this._gripObject = this.getChild("grip");

            if (this._barObjectH) {
                this._barMaxWidth = this._barObjectH.width;
                this._barMaxWidthDelta = this.width - this._barMaxWidth;
                this._barStartX = this._barObjectH.x;
            }
            if (this._barObjectV) {
                this._barMaxHeight = this._barObjectV.height;
                this._barMaxHeightDelta = this.height - this._barMaxHeight;
                this._barStartY = this._barObjectV.y;
            }
            if (this._gripObject) {
                this._gripObject.addEventListener(egret.TouchEvent.TOUCH_BEGIN, this.__gripMouseDown, this);
            }

            this.displayObject.addEventListener(egret.TouchEvent.TOUCH_BEGIN, this.__barMouseDown, this);
        }

        protected handleSizeChanged(): void {
            super.handleSizeChanged();

            if (this._barObjectH)
                this._barMaxWidth = this.width - this._barMaxWidthDelta;
            if (this._barObjectV)
                this._barMaxHeight = this.height - this._barMaxHeightDelta;
            if (!this._underConstruct)
                this.update();
        }

        public setup_afterAdd(buffer: ByteBuffer, beginPos: number): void {
            super.setup_afterAdd(buffer, beginPos);

            if (!buffer.seek(beginPos, 6)) {
                this.update();
                return;
            }

            if (buffer.readByte() != this.packageItem.objectType) {
                this.update();
                return;
            }

            this._value = buffer.readInt();
            this._max = buffer.readInt();
            if (buffer.version >= 2)
                this._min = buffer.readInt();

            this.update();
        }

        private __gripMouseDown(evt: egret.TouchEvent): void {
            this.canDrag = true;
            evt.stopPropagation();

            this._clickPos = this.globalToLocal(evt.stageX, evt.stageY);
            this._clickPercent = ToolSet.clamp01((this._value - this._min) / (this._max - this._min));

            this._gripObject.displayObject.stage.addEventListener(egret.TouchEvent.TOUCH_MOVE, this.__gripMouseMove, this);
            this._gripObject.displayObject.stage.addEventListener(egret.TouchEvent.TOUCH_END, this.__gripMouseUp, this);
        }

        private static sSilderHelperPoint: egret.Point = new egret.Point();
        private __gripMouseMove(evt: egret.TouchEvent): void {
            if (!this.canDrag) {
                return;
            }

            var pt: egret.Point = this.globalToLocal(evt.stageX, evt.stageY, GSlider.sSilderHelperPoint);
            var deltaX: number = pt.x - this._clickPos.x;
            var deltaY: number = pt.y - this._clickPos.y;
            if (this._reverse) {
                deltaX = -deltaX;
                deltaY = -deltaY;
            }

            var percent: number;
            if (this._barObjectH)
                percent = this._clickPercent + deltaX / this._barMaxWidth;
            else
                percent = this._clickPercent + deltaY / this._barMaxHeight;
            this.updateWithPercent(percent, true);
        }

        private __gripMouseUp(evt: egret.TouchEvent): void {
            evt.currentTarget.removeEventListener(egret.TouchEvent.TOUCH_MOVE, this.__gripMouseMove, this);
            evt.currentTarget.removeEventListener(egret.TouchEvent.TOUCH_END, this.__gripMouseUp, this);
        }

        private __barMouseDown(evt: egret.TouchEvent): void {
            if (!this.changeOnClick)
                return;

            var pt: egret.Point = this._gripObject.globalToLocal(evt.stageX, evt.stageY, GSlider.sSilderHelperPoint);
            var percent: number = ToolSet.clamp01((this._value - this._min) / (this._max - this._min));
            var delta: number;
            if (this._barObjectH)
                delta = pt.x / this._barMaxWidth;
            if (this._barObjectV)
                delta = pt.y / this._barMaxHeight;
            if (this._reverse)
                percent -= delta;
            else
                percent += delta;
            this.updateWithPercent(percent, true);
        }
    }
}