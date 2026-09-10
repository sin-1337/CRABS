// Core Socket.IO & Game Shim
declare namespace SocketIO {
  type Socket = import("socket.io-client").Socket<ServerToClientEvents, ClientToServerEvents>;
}
declare function io(serv: string): SocketIO.Socket;

type ClientEvent = import("@socket.io/component-emitter").EventNames<ClientToServerEvents>;
type ClientEventParams<Ev extends ClientEvent> = import("@socket.io/component-emitter").EventParams<ClientToServerEvents, Ev>;
type _SendRateLimitQueueItem<T extends ClientEvent> = T extends ClientEvent ? { Message: T; args: ClientEventParams<T> } : never;
type SendRateLimitQueueItem = _SendRateLimitQueueItem<ClientEvent>;

interface String {
  replaceAt(index: number, character: string): string;
}
declare function parseInt(s: string | number, radix?: number): number;

type MemoizedFunction<T extends Function> = T & { clearCache(): void };

interface WebGLTextureData {
  width: number;
  height: number;
  texture: WebGLTexture;
}

interface WebGL2RenderingContext {
  program?: WebGLProgram;
  programFull?: WebGLProgram;
  programHalf?: WebGLProgram;
  programTexMask?: WebGLProgram;
  programPreMultiplyAlpha?: WebGLProgram;
  textureCache?: Map<string, WebGLTextureData>;
  maskCache?: Map<string, WebGLTexture>;
}

interface WebGLProgram {
  u_alpha?: WebGLUniformLocation;
  u_color?: WebGLUniformLocation;
  a_position?: number;
  a_texcoord?: number;
  u_matrix?: WebGLUniformLocation;
  u_texture?: WebGLUniformLocation;
  u_alpha_texture?: WebGLUniformLocation;
  u_mask_texture?: WebGLUniformLocation;
  position_buffer?: WebGLBuffer;
  texcoord_buffer?: WebGLBuffer;
}

interface HTMLCanvasElement {
  GL?: WebGL2RenderingContext;
}

interface HTMLImageElement {
  errorcount?: number;
}

interface HTMLElement {
  setAttribute(qualifiedName: string, value: any): void;
  removeAttribute(qualifiedName: string): void;
  value: string;
}

interface GamepadButton {
  repeat: boolean;
}

interface RGBColor {
  r: number;
  g: number;
  b: number;
}

interface RGBAColor extends RGBColor {
  a: number;
}

type ElementNoParent = 0;

type HTMLElementScalarTagNameMap = {
  [k1 in keyof HTMLElementTagNameMap]: {
    [k2 in keyof HTMLElementTagNameMap[k1] as Required<HTMLElementTagNameMap[k1][k2]> extends boolean | number | string | null ? k2 : never]: HTMLElementTagNameMap[k1][k2];
  };
};

type HTMLOptionsUnion = { [k in keyof HTMLElementTagNameMap]: HTMLOptions<k> }[keyof HTMLElementTagNameMap];

type HTMLOptions<T extends keyof HTMLElementTagNameMap> = {
  tag: T;
  attributes?: Partial<Record<string, null | number | boolean | string>>;
  dataAttributes?: Partial<Record<string, number | string | boolean>>;
  style?: Record<string, string>;
  eventListeners?: { [k in keyof HTMLElementEventMap]?: (this: HTMLElementTagNameMap[T], event: HTMLElementEventMap[k]) => any };
  parent?: null | ElementNoParent | Node;
  classList?: readonly (null | undefined | string)[];
  children?: readonly (null | undefined | string | Node | HTMLOptionsUnion)[];
  innerHTML?: string;
};

interface HTMLElementEventMap {
  bcClickDisabled: MouseEvent;
  bcTouchHold: MouseEvent;
}

interface HTMLElementTagNameMap {
  "bc-tint-input": HTMLColorTintElement;
}

interface HTMLColorTintElement {
  addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLColorTintElement, ev: HTMLElementEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
}

declare namespace ElementButton {
  type StaticNode = null | string | Node | HTMLOptions<any> | readonly (null | undefined | string | Node | HTMLOptions<any>)[];
  interface CustomIcon {
    iconSrc: string;
    name: string;
    tooltipText?: StaticNode;
  }
  interface Options {
    tooltip?: StaticNode;
    tooltipPosition?: "left" | "right" | "top" | "bottom";
    tooltipRole?: "label" | "description" | "none";
    label?: StaticNode;
    labelPosition?: "top" | "center" | "bottom" | "left" | "right";
    image?: string;
    imageColor?: string;
    icons?: readonly (null | undefined | InventoryIcon | CustomIcon)[];
    role?: "radio" | "combobox" | "checkbox" | "menuitemradio" | "menuitemcheckbox" | "spinbutton";
    noStyling?: boolean;
    disabled?: boolean;
    clickDisabled?: (this: HTMLButtonElement, event: MouseEvent) => any;
    allowRequiredClick?: boolean;
    name?: string;
    tabindex?: number;
    ariaControls?: string | Element | readonly (string | Element)[];
    ariaChecked?: boolean | "true" | "false" | "mixed" | "undefined";
    ariaExpanded?: boolean | "true" | "false" | "undefined";
    ariaHasPopup?: boolean | "true" | "false" | "menu" | "listbox" | "tree" | "grid" | "dialog";
  }
}

declare namespace ElementCheckbox {
  interface Options {
    checked?: boolean;
    disabled?: boolean;
    value?: string | number;
    type?: "checkbox" | "radio";
    required?: boolean;
    name?: string;
  }
  interface LabelOptions extends Options {
    orientation?: "horizontal" | "vertical";
  }
}

type Rect = { x: number; y: number; w: number; h: number };
type RectTuple = [X: number, Y: number, W: number, H: number];
type PartialRectTuple = [X: number, Y: number, W?: number, H?: number];

type CommonSubstituteReplacer = (match: string, offset: number, replacement: string, string: string) => string;
type CommonSubtituteSubstitution = [tag: string, substitution: string, replacer?: CommonSubstituteReplacer];

interface CommonGenerateGridParameters {
  x: number;
  y: number;
  width: number;
  height: number;
  itemWidth: number;
  itemHeight: number;
  itemMarginX?: number;
  itemMarginY?: number;
  direction?: "horizontal" | "vertical";
  minMarginX?: number;
  minMarginY?: number;
}

type CommonGenerateGridCallback<T> = (item: T, x: number, y: number, width: number, height: number) => boolean;

type VariableContainer<T1, T2> = T1 & T2 & {
  readonly Defaults: Readonly<T1>;
  readonly Reset: () => void;
};

type Mutable<T> = { -readonly [P in keyof T]: T[P] };
type Prettify<T> = { [K in keyof T]: T[K] } & unknown;
type Thunk<T> = T | (() => T);
type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Enums & Screen Types
type ChatRoomSpaceLabel = "MIXED" | "FEMALE_ONLY" | "MALE_ONLY" | "ASYLUM";
type ChatRoomVisibilityModeLabel = "PUBLIC" | "ADMIN_WHITELIST" | "ADMIN" | "UNLISTED";
type ChatRoomAccessModeLabel = "PUBLIC" | "ADMIN_WHITELIST" | "ADMIN";

type ChatRoomMenuButton =
  | "Camera" | "Cancel" | "CharacterView" | "Cut" | "CustomizationOn"
  | "CustomizationOff" | "Dress" | "Exit" | "GameOption" | "Icons"
  | "Kneel" | "MapView" | "NextCharacters" | "PreviousCharacters"
  | "Profile" | "RoomAdmin" | "ClearFocus";

type DialogMenuMode =
  | "activities" | "colorDefault" | "colorExpression" | "colorItem"
  | "crafted" | "dialog" | "extended" | "items" | "layering"
  | "locking" | "locked" | "permissions" | "struggle" | "tighten";

type DialogMenuButton =
  | "Activity" | "ColorCancel" | "ColorChange" | "ColorChangeMulti"
  | "ColorDefault" | "ColorPickDisabled" | "ColorSelect" | "Crafting"
  | "NormalMode" | "PermissionMode" | "Dismount" | "Escape" | "Remove"
  | "Exit" | "GGTSControl" | "InspectLock" | "InspectLockDisabled"
  | "Layering" | "Lock" | "LockDisabled" | "LockMenu" | "Swap"
  | "Next" | "Prev" | `PickLock${PickLockAvailability}` | "Remote"
  | "RemoteDisabled" | `RemoteDisabledFor${VibratorRemoteAvailability}`
  | "Unlock" | "Use" | "UseDisabled" | "Struggle" | "TightenLoosen"
  | "Wardrobe" | "WardrobeDisabled" | "Reset" | "WearRandom" | "Random"
  | "Copy" | "Paste" | "Naked" | "Accept" | "Cancel" | "Character";

declare namespace ElementDOMScreen {
  interface TemplateOptions {
    parent?: Node;
    menubarButtons?: readonly HTMLButtonElement[];
    mainContent?: readonly (Node | string | HTMLOptionsUnion)[];
    leftContent?: readonly (Node | string | HTMLOptionsUnion)[];
    rightContent?: readonly (Node | string | HTMLOptionsUnion)[];
    header?: string;
    mainSection?: "left" | "center" | "right" | "none";
    asShadow?: boolean;
    cssFiles?: readonly string[];
    hgroupInHeader?: boolean;
  }
}

declare namespace DialogMenu {
  interface ReloadOptions {
    reset?: boolean;
    status?: string;
    statusTimer?: number;
    resetScrollbar?: boolean;
    resetDialogItems?: boolean;
  }
  interface ReloadParam<T extends InitProperties> {
    root: HTMLElement;
    newProperties: T;
    oldProperties: T;
    textCache: TextCache;
  }
  interface InitProperties {
    C: Character;
    focusGroup?: AssetGroup;
  }
  interface MenuButtonValidateData {
    state: null | "hidden" | "disabled";
    status?: null | string;
  }
  type MenuButtonValidator<T extends InitProperties> = (
    button: HTMLButtonElement,
    properties: T,
    equippedItem?: Item | null
  ) => MenuButtonValidateData | null;
  interface MenuButtonData<T extends InitProperties> {
    click: (button: HTMLButtonElement, ev: MouseEvent, properties: T, equippedItem?: Item | null) => any;
    validate?: Record<string, MenuButtonValidator<T>>;
  }
}

type DialogSortOrder = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
type DialogStruggleActionType = "ActionUse" | "ActionSwap" | "ActionRemove" | "ActionUnlock" | "ActionUnlockAndRemove" | "ActionStruggle" | "ActionEscape" | "ActionDismount";
type CharacterType = "player" | "online" | "npc" | "simple";
type CharacterPronouns = "SheHer" | "HeHim" | "TheyThem";
type VibratorIntensity = -1 | 0 | 1 | 2 | 3;
type VibratorModeState = "Default" | "Deny" | "Orgasm" | "Rest";
type VibratorMode = "Off" | "Low" | "Medium" | "High" | "Maximum" | "Random" | "Escalate" | "Tease" | "Deny" | "Edge";
type VibratorRemoteAvailability = "Available" | "NoRemote" | "NoRemoteOwnerRuleActive" | "NoLoversRemote" | "RemotesBlocked" | "CannotInteract" | "NoAccess" | "InvalidItem";
type PickLockAvailability = "" | "Disabled" | "PermissionsDisabled" | "InaccessibleDisabled" | "NoPicksDisabled";
type ItemVulvaFuturisticVibratorAccessMode = "" | "ProhibitSelf" | "LockMember";
type SpeechTransformName = "gagGarble" | "stutter" | "babyTalk" | "deafen";

type GagEffectName = "GagVeryLight" | "GagEasy" | "GagLight" | "GagNormal" | "GagMedium" | "GagHeavy" | "GagVeryHeavy" | "GagTotal" | "GagTotal2" | "GagTotal3" | "GagTotal4";
type BlindEffectName = "BlindLight" | "BlindNormal" | "BlindHeavy" | "BlindTotal";
type BlurEffectName = "BlurLight" | "BlurNormal" | "BlurHeavy" | "BlurTotal";
type DeafEffectName = "DeafLight" | "DeafNormal" | "DeafHeavy" | "DeafTotal";

type EffectName =
  | GagEffectName | BlindEffectName | BlurEffectName | DeafEffectName
  | "Freeze" | "BlockWardrobe" | "Block" | "Mounted" | "CuffedFeet"
  | "CuffedLegs" | "CuffedArms" | "IsChained" | "FixedHead" | "MergedFingers"
  | "Shackled" | "Tethered" | "MapImmobile" | "MapSwim" | "Enclose"
  | "OneWayEnclose" | "OnBed" | "Lifted" | "Suspended" | "Slow"
  | "FillVulva" | "VulvaShaft" | "IsPlugged" | "Egged" | "Vibrating"
  | "ForcedErection" | "Edged" | "DenialMode" | "RuinOrgasms" | "Remote"
  | "UseRemote" | "BlockRemotes" | "Lock" | "NotSelfPickable" | "Chaste"
  | "BreastChaste" | "ButtChaste" | "Leash" | "IsLeashed" | "CrotchRope"
  | "ReceiveShock" | "TriggerShock" | "OpenPermission" | "OpenPermissionArm"
  | "OpenPermissionLeg" | "OpenPermissionChastity" | "BlockMouth" | "OpenMouth"
  | "VR" | "VRAvatars" | "KinkyDungeonParty" | "RegressedTalk" | "HideRestraints"
  | "UnlockMetalPadlock" | "UnlockOwnerPadlock" | "UnlockOwnerTimerPadlock"
  | "UnlockLoversPadlock" | "UnlockLoversTimerPadlock" | "UnlockFamilyPadlock"
  | "UnlockMistressPadlock" | "UnlockMistressTimerPadlock" | "UnlockPandoraPadlock"
  | "UnlockMetalCuffs" | "UnlockEscortAnkleCuffs" | "UnlockPortalPanties"
  | "ProtrudingMouth" | "Wiggling" | "CanEdge";

interface ExpressionNameMap {
  Eyebrows: null | "Raised" | "Lowered" | "OneRaised" | "Harsh" | "Angry" | "Soft";
  Eyes: null | "Closed" | "Dazed" | "Shy" | "Sad" | "Horny" | "Lewd" | "VeryLewd" | "Heart" | "HeartPink" | "LewdHeart" | "LewdHeartPink" | "Dizzy" | "Daydream" | "ShylyHappy" | "Angry" | "Surprised" | "Scared";
  Eyes2: ExpressionNameMap["Eyes"];
  Mouth: null | "Frown" | "Sad" | "Pained" | "Angry" | "HalfOpen" | "Open" | "Ahegao" | "Moan" | "TonguePinch" | "LipBite" | "Happy" | "Devious" | "Laughing" | "Grin" | "Smirk" | "Pout";
  Pussy: null | "Hard";
  Blush: null | "Low" | "Medium" | "High" | "VeryHigh" | "Extreme" | "ShortBreath";
  Fluids: null | "DroolLow" | "DroolMedium" | "DroolHigh" | "DroolSides" | "DroolMessy" | "DroolTearsLow" | "DroolTearsMedium" | "DroolTearsHigh" | "DroolTearsMessy" | "DroolTearsSides" | "TearsHigh" | "TearsMedium" | "TearsLow";
  Emoticon: null | "Afk" | "Whisper" | "Sleep" | "Hearts" | "Tear" | "Hearing" | "Confusion" | "Exclamation" | "Annoyed" | "Read" | "RaisedHand" | "Spectator" | "ThumbsDown" | "ThumbsUp" | "LoveRope" | "LoveGag" | "LoveLock" | "Wardrobe" | "Gaming" | "Coffee" | "Fork" | "Music" | "Car" | "Hanger" | "Call" | "Lightbulb" | "Warning" | "BrokenHeart" | "Drawing" | "Coding" | "TV" | "Bathing" | "Shopping" | "Brb" | "Work" | "SOS";
}

type ExpressionGroupName = keyof ExpressionNameMap;
type ExpressionName = ExpressionNameMap[ExpressionGroupName];

type AssetGroupItemName =
  | 'ItemAddon' | 'ItemArms' | 'ItemBoots' | 'ItemBreast' | 'ItemButt'
  | 'ItemDevices' | 'ItemEars' | 'ItemFeet' | 'ItemHands' | 'ItemHead'
  | 'ItemHood' | 'ItemLegs' | 'ItemMisc' | 'ItemMouth' | 'ItemMouth2'
  | 'ItemMouth3' | 'ItemNeck' | 'ItemNeckAccessories' | 'ItemNeckRestraints'
  | 'ItemNipples' | 'ItemNipplesPiercings' | 'ItemNose' | 'ItemPelvis'
  | 'ItemTorso' | 'ItemTorso2' | 'ItemVulva' | 'ItemVulvaPiercings' | 'ItemHandheld';

type AssetGroupScriptName = 'ItemScript';

type AssetGroupBodyName =
  | ExpressionGroupName | 'AnkletLeft' | 'AnkletRight' | 'ArmsLeft' | 'ArmsRight'
  | 'BodyStyle' | 'BodyLower' | 'BodyUpper' | 'BodyMarkings' | 'Bra' | 'Bracelet' | 'Cloth'
  | 'ClothAccessory' | 'ClothLower' | 'ClothOuter' | 'Corset' | 'Decals' | 'EyeShadow' | 'FacialHair'
  | 'Garters' | 'Glasses' | 'Gloves' | 'HairAccessory1' | 'HairAccessory2' | 'HairAccessory3'
  | 'HairBack' | 'HairFront' | 'HandAccessoryLeft' | 'HandAccessoryRight' | 'FacialHair' | 'Hat'
  | 'Head' | 'Height' | 'Jewelry' | 'Mask' | 'Necklace' | 'Nipples' | 'Panties' | 'Pronouns'
  | 'Shoes' | 'Socks' | 'SocksLeft' | 'SocksRight' | 'Suit' | 'SuitLower' | 'TailStraps' | 'Wings'
  | 'HandsLeft' | 'HandsRight' | 'FaceMarkings';

type AssetGroupName = AssetGroupBodyName | AssetGroupItemName | AssetGroupScriptName;

interface AssetPoseMap {
  BodyHands: 'TapedHands';
  BodyUpper: 'BaseUpper' | 'BackBoxTie' | 'BackCuffs' | 'BackElbowTouch' | 'OverTheHead' | 'Yoked';
  BodyLower: 'BaseLower' | 'Kneel' | 'KneelingSpread' | 'LegsClosed' | 'LegsOpen' | 'Spread';
  BodyFull: 'Hogtied' | 'AllFours';
  BodyAddon: 'Suspension';
}

type AssetPoseCategory = keyof AssetPoseMap;
type AssetPoseName = AssetPoseMap[keyof AssetPoseMap];
type AssetPoseMapping = Partial<Record<AssetPoseName, AssetPoseName | PoseType>>;
type PoseType = "Hide" | PoseTypeDefault;
type PoseTypeDefault = "";
type PoseChangeStatus = 0 | 1 | 2 | 3;

type AssetLockType =
  | "CombinationPadlock" | "ExclusivePadlock" | "HighSecurityPadlock"
  | "IntricatePadlock" | "LoversPadlock" | "LoversTimerPadlock" | "FamilyPadlock"
  | "MetalPadlock" | "MistressPadlock" | "MistressTimerPadlock"
  | "OwnerPadlock" | "OwnerTimerPadlock" | "PandoraPadlock"
  | "PasswordPadlock" | "PortalLinkPadlock" | "SafewordPadlock" | "TimerPadlock"
  | "TimerPasswordPadlock";

type CraftingPropertyType =
  | "Normal" | "Large" | "Small" | "Thick" | "Thin" | "Secure" | "Loose" | "Decoy"
  | "Malleable" | "Rigid" | "Simple" | "Puzzling" | "Painful" | "Comfy" | "Strong"
  | "Flexible" | "Nimble" | "Arousing" | "Dull" | "Edging" | "Heavy" | "Light";

type AssetAttribute =
  | "Skirt" | "SuitLower" | "UpperLarge" | "Diaper" | "ShortHair" | "SmallEars" | "NoEars"
  | "NoseRing" | "HoodieFix" | "CanAttachMittens" | "IsChestHarness" | "IsHipHarness"
  | "PenisLayer" | "PussyLayer" | "GenitaliaCover" | "Pussy1" | "Pussy2" | "Pussy3"
  | "CagePlastic2" | "CageTechno" | "CageFlat" | "FuturisticRecolor" | "FuturisticRecolorDisplay"
  | "PortalLinkLockable" | `PortalLinkChastity${string}` | `PortalLinkActivity${ActivityName}` | `PortalLinkTarget${AssetGroupItemName}`;

type PosePrerequisite = `Can${AssetPoseName}`;

type AssetPrerequisite =
  | PosePrerequisite | "AccessBreast" | "AccessBreastSuitZip" | "AccessButt" | "AccessFullPenis"
  | "AccessMouth" | "AccessTorso" | "AccessVulva" | "AccessCrotch" | "BlockedMouth" | "ButtEmpty"
  | "CanBeCeilingTethered" | "CanCoverVulva" | "CanHaveErection" | "CanBeLimp" | "CanKneel"
  | "CannotBeSuited" | "CannotHaveWand" | "CanAttachMittens" | "ClitEmpty" | "Collared"
  | "CuffedArms" | "CuffedArmsOrEmpty" | "CuffedFeet" | "CuffedFeetOrEmpty" | "CuffedLegs"
  | "CuffedLegsOrEmpty" | "DisplayFrame" | "EyesEmpty" | "GagCorset" | "GagFlat" | "GagUnique"
  | "GasMask" | "HasBreasts" | "HasFlatChest" | "HasPenis" | "HasVagina" | "HoodEmpty"
  | "NakedFeet" | "NakedHands" | "NeedsChestHarness" | "NeedsHipHarness" | "NeedsNippleRings"
  | "NoChastityCage" | "NoErection" | "NoClothLower" | "NoItemArms" | "NoItemFeet" | "NoItemHands"
  | "NoItemLegs" | "NoMaidTray" | "NoOuterClothes" | "NotChained" | "NotChaste" | "NotKneeling"
  | "NotLifted" | "NotMasked" | "NotMounted" | "NotProtrudingFromMouth" | "NotSuspended" | "OnBed"
  | "RemotesAllowed" | "VulvaEmpty";

type CraftingStatusType = 0 | 1 | 2;
type ItemColorMode = "Default" | "ColorPicker";
type CharacterHook = "BeforeSortLayers" | "AfterLoadCanvas";
type ChatColorThemeType = "Light" | "Dark" | "Light2" | "Dark2";
type ChatEnterLeaveType = "Normal" | "Smaller" | "Hidden";
type ChatMemberNumbersType = "Always" | "Never" | "OnMouseover";
type ChatFontSizeType = "Small" | "Medium" | "Large";
type ArousalActiveName = "Inactive" | "NoMeter" | "Manual" | "Hybrid" | "Automatic";
type ArousalVisibleName = "All" | "Access" | "Self";
type ArousalAffectStutterName = "None" | "Arousal" | "Vibration" | "All";
type SettingsSensDepName = "SensDepLight" | "Normal" | "SensDepNames" | "SensDepTotal" | "SensDepExtreme";
type SettingsVFXName = "VFXInactive" | "VFXSolid" | "VFXAnimatedTemp" | "VFXAnimated";
type SettingsVFXVibratorName = "VFXVibratorInactive" | "VFXVibratorSolid" | "VFXVibratorAnimated";
type SettingsVFXFilterName = "VFXFilterLight" | "VFXFilterMedium" | "VFXFilterHeavy" | "VFXFilterNone";
type GraphicsFontName = "Arial" | "TimesNewRoman" | "Papyrus" | "ComicSans" | "Impact" | "HelveticaNeue" | "Verdana" | "CenturyGothic" | "Georgia" | "CourierNew" | "Copperplate";
type PreferenceSubscreenName = "General" | "Difficulty" | "Restriction" | "Chat" | "CensoredWords" | "Audio" | "Arousal" | "Security" | "Online" | "Visibility" | "Immersion" | "Graphics" | "Controller" | "Notifications" | "Gender" | "Scripts" | "Extensions" | "Main" | "Keybindings";

interface PreferenceSubscreen {
  name: PreferenceSubscreenName;
  description?: string;
  icon?: string;
  hidden?: boolean;
  load?: () => void | Promise<void>;
  run: () => void;
  click: () => void;
  exit?: () => boolean | Promise<boolean>;
  unload?: () => void;
  resize?: (onLoad: boolean) => void;
  keyUp?: (event: KeyboardEvent) => void;
}

interface PreferenceGenderSetting {
  Female: boolean;
  Male: boolean;
}

type FetishName = "Bondage" | "Gagged" | "Blindness" | "Deafness" | "Chastity" | "Exhibitionist" | "Masochism" | "Sadism" | "Rope" | "Latex" | "Leather" | "Metal" | "Tape" | "Nylon" | "Lingerie" | "Pet" | "Pony" | "ABDL" | "Forniphilia" | "Spandex";
type BackgroundTag = "Filter by tag" | "Indoor" | "Outdoor" | "Aquatic" | "Special Events" | "SciFi & Fantasy" | "Club" | "College" | "Regular house" | "Dungeon" | "Asylum" | "Pandora" | "Club Cards";
type MagicSchoolHouse = "Maiestas" | "Vincula" | "Amplector" | "Corporis";

interface ModuleScreens {
  Character: "Appearance" | "BackgroundSelection" | "Cheat" | "Creation" | "Disclaimer" | "FriendList" | "InformationSheet" | "ItemColor" | "Login" | "OnlineProfile" | "PasswordReset" | "Player" | "Preference" | "Relog" | "Title" | "Wardrobe";
  Cutscene: "NPCCollaring" | "NPCSlaveAuction" | "NPCWedding" | "PlayerCollaring" | "PlayerMistress" | "SarahIntro";
  MiniGame: "Chess" | "ChestLockpick" | "ClubCard" | "ClubCardBuilder" | "DojoStruggle" | "GetUp" | "HorseWalk" | "Kidnap" | "KinkyDungeon" | "Lockpick" | "MagicBattle" | "MagicPuzzle" | "MaidCleaning" | "MaidDrinks" | "PlayerAuction" | "PuppyWalker" | "RhythmGame" | "SlaveAuction" | "Tennis" | "Therapy" | "WheelFortune";
  Online: "AdvancedRule" | "ChatAdmin" | "ChatAdminRoomCustomization" | "ChatBlockItem" | "ChatRoom" | "ChatSearch" | "ChatSelect" | "ForbiddenWords" | "Game" | "GameClubCard" | "GameLARP" | "GameMagicBattle" | "NicknameManagement" | "WheelFortuneCustomize";
  Room: "Arcade" | "AsylumBedroom" | "AsylumEntrance" | "AsylumGGTS" | "AsylumMeeting" | "AsylumTherapy" | "Cafe" | "Cell" | "ClubCardLounge" | "CollegeCafeteria" | "CollegeChess" | "CollegeDetention" | "CollegeEntrance" | "CollegeTeacher" | "CollegeTennis" | "CollegeTheater" | "Crafting" | "DailyJob" | "Empty" | "Gambling" | "Infiltration" | "InfiltrationPerks" | "Introduction" | "KidnapLeague" | "LARP" | "Magic" | "MagicSchoolEscape" | "MagicSchoolLaboratory" | "MagicSchoolFindsAround" | "MaidQuarters" | "MainHall" | "Management" | "MovieStudio" | "Nursery" | "Pandora" | "PandoraPrison" | "Photographic" | "Platform" | "PlatformIntro" | "PlatformDialog" | "PlatformProfile" | "Poker" | "Prison" | "Private" | "PrivateBed" | "PrivateRansom" | "Sarah" | "Shibari" | "Shop" | "Shop2" | "SlaveMarket" | "Stable";
}

type ModuleType = keyof ModuleScreens;
type ScreenName = ModuleScreens["Character"] | ModuleScreens["Cutscene"] | ModuleScreens["MiniGame"] | ModuleScreens["Online"] | ModuleScreens["Room"];
type RoomName = ModuleScreens[ModuleType];

interface RelogDataBase<T extends ModuleType> {
  Screen: ModuleScreens[T];
  Module: T;
  Character: Character | null;
  ChatRoomName: string | null;
}
type _RelogDataMap<T> = T extends ModuleType ? RelogDataBase<T> : never;
type RelogData = _RelogDataMap<ModuleType>;

interface ScreenSpecifierOptions {
  recursive?: boolean;
}
type _ScreenSpecifier<T extends ModuleType> = [module: T, screen: ModuleScreens[T], options?: null | ScreenSpecifierOptions];
type ScreenSpecifier = _ScreenSpecifier<"Character"> | _ScreenSpecifier<"Cutscene"> | _ScreenSpecifier<"MiniGame"> | _ScreenSpecifier<"Online"> | _ScreenSpecifier<"Room">;

type AssetCategory = "Medical" | "Extreme" | "Pony" | "SciFi" | "ABDL" | "Fantasy" | "Smoking";
type PortalLinkStatus = "PortalLinkInvalidCode" | "PortalLinkClipboardError" | "PortalLinkValidCode" | `PortalLinkSearching${number}` | "PortalLinkDuplicateCode" | "PortalLinkTargetNotFound" | "PortalLinkEstablished";
type PortalLinkFunction = "PortalLinkFunctionLock" | "PortalLinkFunctionUnlock" | "PortalLinkFunctionCycleChastity" | `PortalLinkFunctionActivity${ActivityName}`;
type ThumbIcon = "lock" | "blindfold" | "lightbulb" | "player" | "rope";

// Chat Room Engine Types
type ChatRoomLovershipEvent = "CanOfferBeginDating" | "CanBeginDating" | "CanOfferBeginEngagement" | "CanBeginEngagement" | "CanOfferBeginWedding" | "CanBeginWedding";
type ChatRoomOwnershipEvent = "CanOfferStartTrial" | "CanStartTrial" | "CanOfferEndTrial" | "CanEndTrial";

type ChatRoom = ServerChatRoomData;
type ChatRoomSettings = Prettify<Omit<ServerChatRoomData, "Character" | "Custom" | "Space"> & Partial<Pick<ServerChatRoomData, "Custom" | "Space">>>;
type ChatRoomAdminSettings = Prettify<ChatRoomSettings & Required<Pick<ChatRoomSettings, "MapData">>>;
type ChatRoomSearchResult = ServerChatRoomSearchData & { DisplayName: string; Order: number };

interface ChatSearchLobbyOptions {
  Game?: ServerChatRoomGame;
  Background?: string;
  BackgroundTagList?: BackgroundTag[];
}

type StimulationAction = "Kneel" | "Walk" | "Struggle" | "StruggleFail" | "Talk";

interface StimulationEvent {
  Chance: number;
  ArousalScaling?: number;
  VibeScaling?: number;
  InflationScaling?: number;
  TalkChance?: number;
}

type StimulationEventType = "CrotchRope" | "Talk" | "Vibe" | "Inflated" | "Wiggling" | "PlugFront" | "PlugBack" | "PlugBoth";

interface StimulationEventItem {
  item: Item;
  event: StimulationEventType;
  chance: number;
  arousal: number;
}

interface ChatRoomChatLogEntry {
  Chat: string;
  Garbled: string;
  Original: string;
  SenderName: string;
  SenderMemberNumber: number;
  Time: number;
}

interface IChatRoomMessageMetadata {
  senderName?: string;
  TargetCharacter?: Character;
  AdditionalTargets?: Record<number, Character>;
  SourceCharacter?: Character;
  TargetMemberNumber?: number;
  Automatic?: boolean;
  FocusGroup?: AssetItemGroup;
  GroupName?: AssetGroupName;
  Assets?: Record<string, Asset>;
  CraftingNames?: Record<string, string>;
  Groups?: Partial<Record<AssetGroupName, AssetGroup[]>>;
  ShockIntensity?: number;
  ActivityCounter?: number;
  ActivityName?: ActivityName;
  ActivityAsset?: Asset;
  ChatRoomName?: string;
  OriginalMsg?: string;
  ReplyId?: string;
  MsgId?: string;
  HasSuperPowers?: boolean;
}

type ChatRoomMessageExtractor = (data: ServerChatRoomMessage, sender: Character) => { metadata: IChatRoomMessageMetadata; substitutions: CommonSubtituteSubstitution[] } | null;

interface ChatRoomMessageHandler {
  Description?: string;
  Priority: number;
  Callback: (data: ServerChatRoomMessage, sender: Character, msg: string, metadata?: IChatRoomMessageMetadata) => boolean | { msg?: string; skip?: (handler: ChatRoomMessageHandler) => boolean };
}

interface IFriendListBeepLogMessage {
  MemberNumber?: number;
  MemberName: string;
  ChatRoomName?: string;
  Private: boolean;
  ChatRoomSpace?: ServerChatRoomSpace;
  Sent: boolean;
  Time: Date;
  Message?: string;
}

// Assets & Appearance
type IAssetFamily = "Female3DCG";
type WardrobeReorderType = "None" | "Select" | "Place";

interface AssetGroup {
  readonly Family: IAssetFamily;
  readonly Name: AssetGroupName;
  readonly Description: string;
  readonly Asset: readonly Asset[];
  readonly ParentGroup: ParentGroup.Data;
  readonly Category: 'Appearance' | 'Item' | 'Script';
  readonly IsDefault: boolean;
  readonly IsRestraint: boolean;
  readonly AllowNone: boolean;
  readonly AllowColorize: boolean;
  readonly AllowCustomize: boolean;
  readonly Random?: boolean;
  readonly ColorSchema: readonly BCColor[];
  readonly DefaultColor: BCColor;
  readonly ParentSize: AssetGroupName | "";
  readonly ParentColor: AssetGroupName | "";
  readonly Clothing: boolean;
  readonly Underwear: boolean;
  readonly BodyCosplay: boolean;
  readonly Hide?: readonly AssetGroupName[];
  readonly Block?: readonly AssetGroupItemName[];
  readonly Zone?: readonly RectTuple[];
  readonly SetPose?: readonly AssetPoseName[];
  readonly PoseMapping: AssetPoseMapping;
  readonly AllowExpression?: readonly ExpressionName[];
  readonly Effect: readonly EffectName[];
  readonly MirrorGroup: AssetGroupName | "";
  readonly RemoveItemOnRemove: readonly Readonly<{ Group: AssetGroupItemName; Name: string; TypeRecord?: TypeRecord }>[];
  readonly EditOpacity: boolean;
  readonly MinOpacity: number;
  readonly MaxOpacity: number;
  readonly DrawingPriority: number;
  readonly DrawingLeft: TopLeft.Data;
  readonly DrawingTop: TopLeft.Data;
  readonly DrawingBlink: boolean;
  readonly InheritColor: AssetGroupName | null;
  readonly PreviewZone?: RectTuple;
  readonly DynamicGroupName: AssetGroupName;
  readonly StyleOverride?: string[];
  readonly CreateLayerTypesOverride?: number[];
  readonly Reposition?: { Group?: string; ShiftX?: number; ShiftY?: number }[];
  readonly MirrorActivitiesFrom?: AssetGroupItemName;
  readonly ArousalZone?: AssetGroupItemName;
  readonly ArousalZoneID?: number;
  readonly ColorSuffix: Readonly<Partial<Record<"HEX_COLOR" | BCColor, BCColor>>>;
  readonly ExpressionPrerequisite?: readonly AssetPrerequisite[];
  readonly HasPreviewImages: boolean;
  IsAppearance(): this is AssetAppearanceGroup;
  IsItem(): this is AssetItemGroup;
  IsScript(): this is AssetScriptGroup;
}

interface AssetAppearanceGroup extends AssetGroup {
  readonly Category: "Appearance";
  readonly Name: AssetGroupBodyName;
  readonly IsRestraint: false;
}

interface AssetItemGroup extends AssetGroup {
  readonly Category: "Item";
  readonly Name: AssetGroupItemName;
  readonly Underwear: false;
  readonly BodyCosplay: false;
  readonly Clothing: false;
  readonly IsDefault: false;
  readonly Zone: readonly RectTuple[];
}

interface AssetScriptGroup extends AssetGroup {
  readonly Category: "Script";
  readonly Name: AssetGroupScriptName;
  readonly IsRestraint: false;
  readonly BodyCosplay: false;
  readonly Underwear: false;
  readonly Clothing: false;
  readonly IsDefault: false;
}

type AssetGroupMapping = (
  { [key in AssetGroupBodyName]: AssetAppearanceGroup }
  & { [key in AssetGroupItemName]: AssetItemGroup }
  & { [key in AssetGroupScriptName]: AssetScriptGroup }
);

interface AssetLayer {
  readonly Name: LayerName | null;
  readonly StyleOverride?: string[];
  readonly CreateLayerTypesOverride?: number[];
  readonly AllowColorize: boolean;
  readonly CopyLayerColor: LayerName | null;
  readonly ColorGroup: string | null;
  readonly HideColoring: boolean;
  readonly AllowTypes: AllowTypes.Data | null;
  readonly ParentGroup: ParentGroup.Data;
  readonly PoseMapping: Readonly<AssetPoseMapping>;
  readonly Priority: number;
  readonly InheritColor: AssetGroupName | null;
  readonly Alpha: readonly Alpha.Data[];
  readonly Asset: Asset;
  readonly DrawingLeft: TopLeft.Data;
  readonly DrawingTop: TopLeft.Data;
  readonly HideAs?: Readonly<{ Group: AssetGroupName; Asset?: string }>;
  readonly FixedPosition?: boolean;
  readonly HasImage: boolean;
  readonly Opacity: number;
  readonly MinOpacity: number;
  readonly MaxOpacity: number;
  readonly BlendingMode: GlobalCompositeOperation;
  readonly TextureMask?: AssetLayerMaskTexureDefinition;
  readonly LockLayer: boolean;
  readonly MirrorExpression?: AssetGroupName;
  readonly ColorIndex: number;
  readonly GroupAlpha?: readonly Alpha.Data[];
  readonly CreateLayerTypes: readonly string[];
  readonly HideForAttribute: readonly AssetAttribute[] | null;
  readonly ShowForAttribute: readonly AssetAttribute[] | null;
  readonly Visibility: "Player" | "AllExceptPlayerDialog" | "Others" | "OthersExceptDialog" | "Owner" | "Lovers" | "Mistresses" | null;
  readonly ColorSuffix: Readonly<Partial<Record<"HEX_COLOR" | BCColor, BCColor>>> | null;
}

interface TintDefinition {
  Color: number | BCColor;
  Strength: number;
  DefaultColor?: BCColor;
}

interface ResolvedTintDefinition extends TintDefinition {
  Item: Item;
}

interface ExpressionTriggerBase<GroupName extends ExpressionGroupName> {
  Group: GroupName;
  Name: ExpressionNameMap[GroupName];
  Timer: number;
}
type ExpressionTriggerMap<T> = T extends ExpressionGroupName ? ExpressionTriggerBase<T> : never;
type ExpressionTrigger = ExpressionTriggerMap<ExpressionGroupName>;

interface ExpressionItem {
  Appearance: Item;
  Group: ExpressionGroupName;
  CurrentExpression: null | ExpressionName;
  ExpressionList: ExpressionName[];
}

interface ExpressionPair {
  Group: Exclude<ExpressionGroupName, "Eyes2">;
  Expression: null | ExpressionName;
}

interface Asset {
  readonly Name: string;
  readonly Description: string;
  readonly Group: AssetGroup;
  readonly ParentItem?: string;
  readonly ParentGroup: ParentGroup.Data;
  readonly Enable: boolean;
  readonly Visible: boolean;
  readonly NotVisibleOnScreen?: readonly string[];
  readonly Wear: boolean;
  readonly Activity: ActivityName | null;
  readonly AllowActivity?: readonly ActivityName[];
  readonly ActivityAudio?: readonly string[];
  readonly ActivityExpression: Readonly<Partial<Record<ActivityName, readonly ExpressionTrigger[]>>>;
  readonly AllowActivityOn: readonly AssetGroupItemName[];
  readonly InventoryID?: number;
  readonly BuyGroup?: string;
  readonly Effect: readonly EffectName[];
  readonly Bonus?: AssetBonusName;
  readonly Block?: readonly AssetGroupItemName[];
  readonly Expose: readonly AssetGroupItemName[];
  readonly Hide?: readonly AssetGroupName[];
  readonly HideItem?: readonly string[];
  readonly HideItemExclude: readonly string[];
  readonly HideItemAttribute: readonly AssetAttribute[];
  readonly Require: readonly AssetGroupBodyName[];
  readonly SetPose?: readonly AssetPoseName[];
  readonly StyleOverride?: string[];
  readonly SupportedStyles?: string[];
  readonly CreateLayerTypesOverride?: number[];
  readonly DrawOffset?: { Group?: AssetGroupName; Asset?: string; Layer?: string[]; X?: number; Y?: number }[];
  readonly PoseMapping: Readonly<AssetPoseMapping>;
  readonly AllowActivePose?: readonly AssetPoseName[];
  readonly Value: number;
  readonly NeverSell: boolean;
  readonly Difficulty: number;
  readonly SelfBondage: number;
  readonly SelfUnlock: boolean;
  readonly ExclusiveUnlock: boolean;
  readonly Random: boolean;
  readonly RemoveAtLogin: boolean;
  readonly WearTime: number;
  readonly RemoveTime: number;
  readonly RemoveTimer: number;
  readonly MaxTimer: number;
  readonly DrawingPriority?: number;
  readonly DrawingLeft: TopLeft.Data;
  readonly DrawingTop: TopLeft.Data;
  readonly HeightModifier: number;
  readonly ZoomModifier: number;
  readonly Alpha: null | readonly Alpha.Data[];
  readonly Prerequisite: readonly AssetPrerequisite[];
  readonly Extended: boolean;
  readonly AlwaysExtend: boolean;
  readonly AlwaysInteract: boolean;
  readonly AllowLock: boolean;
  readonly LayerVisibility: boolean;
  readonly IsLock: boolean;
  readonly PickDifficulty: number;
  readonly OwnerOnly: boolean;
  readonly LoverOnly: boolean;
  readonly FamilyOnly: boolean;
  readonly ExpressionTrigger?: readonly ExpressionTrigger[];
  readonly RemoveItemOnRemove: readonly { Name: string; Group: AssetGroupName; TypeRecord?: TypeRecord }[];
  readonly AllowEffect?: readonly EffectName[];
  readonly AllowBlock?: readonly AssetGroupItemName[];
  readonly AllowHide?: readonly AssetGroupName[];
  readonly AllowHideItem?: readonly string[];
  readonly AllowTighten: boolean;
  readonly DefaultColor: readonly BCColor[];
  readonly Opacity: number;
  readonly MinOpacity: number;
  readonly MaxOpacity: number;
  readonly EditOpacity: boolean;
  readonly Audio?: string;
  readonly Category?: readonly AssetCategory[];
  readonly Fetish?: readonly FetishName[];
  readonly CustomBlindBackground?: string;
  readonly ArousalZone: AssetGroupItemName;
  readonly IsRestraint: boolean;
  readonly BodyCosplay: boolean;
  readonly OverrideBlinking: boolean;
  readonly DialogSortOverride?: DialogSortOrder;
  readonly DynamicDescription: (C: Character) => string;
  readonly DynamicPreviewImage: (C: Character) => string;
  readonly DynamicAllowInventoryAdd: (C: Character) => boolean;
  readonly DynamicName: (C: Character) => string;
  readonly DynamicGroupName: AssetGroupName;
  readonly DynamicActivity: (C: Character) => ActivityName | null | undefined;
  readonly DynamicAudio: ((C: Character) => string) | null;
  readonly AllowRemoveExclusive: boolean;
  readonly InheritColor: null | AssetGroupName;
  readonly DynamicBeforeDraw: boolean;
  readonly DynamicAfterDraw: boolean;
  readonly DynamicScriptDraw: boolean;
  readonly CreateLayerTypes: readonly string[];
  readonly AllowLockType: null | Partial<Record<string, Set<number>>>;
  readonly AllowColorizeAll?: never;
  readonly AvailableLocations: readonly string[];
  readonly OverrideHeight?: Readonly<AssetOverrideHeight>;
  readonly DrawLocks: boolean;
  readonly AllowExpression?: readonly ExpressionName[];
  readonly MirrorExpression?: AssetGroupName;
  readonly FixedPosition: boolean;
  readonly Layer: readonly AssetLayer[];
  readonly ColorableLayerCount: number;
  readonly Archetype?: ExtendedArchetype;
  readonly Attribute: readonly AssetAttribute[];
  readonly PreviewIcons: readonly InventoryIcon[];
  readonly Tint: readonly Readonly<TintDefinition>[];
  readonly AllowTint: boolean;
  readonly DefaultTint?: BCColor;
  readonly Gender?: AssetGender;
  readonly CraftGroup: string;
  readonly ColorSuffix: Readonly<Partial<Record<"HEX_COLOR" | BCColor, BCColor>>>;
  readonly FullAlpha: boolean;
  readonly ExpressionPrerequisite?: readonly AssetPrerequisite[];
  readonly AllowColorize: boolean;
}

type ItemBundle = ServerItemBundle;
type WardrobeItemBundle = [Name: string, Group: AssetGroupName, Color?: ItemColor, Property?: ItemProperties];
type AppearanceBundle = ItemBundle[];

interface ClipboardItemBundle {
  G: AssetGroupName;
  A: string;
  C?: ItemColor;
}
type ClipboardAppearanceBundle = ClipboardItemBundle[];

interface Pose {
  Name: AssetPoseName;
  Category: AssetPoseCategory;
  AllowMenu?: true;
  AllowMenuTransient?: true;
  OverrideHeight?: AssetOverrideHeight;
  MovePosition?: { Group: AssetGroupName; X: number; Y: number }[];
}

type ActivityNameBasic =
  | "Bite" | "Brush" | "Caress" | "Choke" | "Clean" | "Cuddle" | "FrenchKiss"
  | "GagKiss" | "GaggedKiss" | "Grope" | "HandGag" | "Kick" | "Kiss" | "Lick"
  | "MassageFeet" | "MassageHands" | "MasturbateFist" | "MasturbateFoot"
  | "MasturbateHand" | "MasturbateTongue" | "MoanGag" | "MoanGagAngry"
  | "MoanGagGiggle" | "MoanGagGroan" | "MoanGagTalk" | "MoanGagWhimper"
  | "Nibble" | "Nod" | "PenetrateFast" | "PenetrateSlow" | "Pet" | "Pinch"
  | "PoliteKiss" | "Pull" | "RestHead" | "Rub" | "Scratch" | "Sit" | "Slap"
  | "Spank" | "Step" | "StruggleArms" | "StruggleLegs" | "Suck"
  | "SuckPenetrateItem" | "DeepThroat" | "TakeCare" | "Tickle" | "Whisper"
  | "Wiggle" | "SistersHug" | "BrothersHandshake" | "SiblingsCheekKiss" | "CollarGrab";

type ActivityNameItem = "Inject" | "MasturbateItem" | "PenetrateItem" | "PourItem" | "RollItem" | "RubItem" | "BrushItem" | "ShockItem" | "SipItem" | "SpankItem" | "SqueezeItem" | "TickleItem" | "EatItem" | "Scratch" | "ThrowItem";
type ActivityName = ActivityNameBasic | ActivityNameItem;

type ActivityPrerequisite =
  | "AssEmpty" | "CantUseArms" | "CantUseFeet" | "CanUsePenis" | "CanUseTongue" | "HasVagina" | "IsGagged" | "MoveHead"
  | `Needs-${ActivityNameItem}` | `TargetNeeds-${ActivityNameItem}`
  | "TargetCanUseTongue" | "TargetKneeling" | "TargetMouthBlocked" | "TargetMouthOpen" | "TargetZoneAccessible" | "TargetZoneNaked"
  | "UseArms" | "UseFeet" | "UseHands" | "UseMouth" | "UseTongue" | "VulvaEmpty" | "ZoneAccessible" | "ZoneNaked"
  | "Sisters" | "Brothers" | "SiblingsWithDifferentGender" | "Collared";

interface Activity {
  Name: ActivityName;
  ActivityID: number;
  MaxProgress: number;
  MaxProgressSelf?: number;
  Prerequisite: ActivityPrerequisite[];
  Target: AssetGroupItemName[];
  TargetSelf?: AssetGroupItemName[] | true;
  MakeSound?: boolean;
  StimulationAction?: StimulationAction;
  ActivityExpression?: ExpressionTrigger[];
}

type ItemActivityRestriction = "blocked" | "limited" | "unavail";

interface ItemActivity {
  Activity: Activity;
  Group: AssetGroupName;
  Item?: Item;
  Blocked?: ItemActivityRestriction;
}

type ItemColor = BCColor | BCColor[];

interface Item {
  Asset: Asset;
  Color?: ItemColor;
  Difficulty?: number;
  Craft?: CraftingItem;
  Property?: ItemProperties;
}

interface ItemColorProperties extends ItemProperties {
  Opacity: number[];
}

interface ItemColorItem extends Item {
  Color: BCColor[];
  Property: ItemColorProperties;
}

type FavoriteIcon = "Favorite" | "FavoriteBoth" | "FavoritePlayer";
type ItemEffectIcon = "BlindLight" | "BlindNormal" | "BlindHeavy" | "DeafLight" | "DeafNormal" | "DeafHeavy" | "GagLight" | "GagNormal" | "GagHeavy" | "GagTotal" | "Freeze" | "Block";
type ShopIcon = "Extended" | "BuyGroup";
type InventoryIcon = FavoriteIcon | ItemEffectIcon | "AllowedLimited" | "Handheld" | "Locked" | "LoverOnly" | "FamilyOnly" | "OwnerOnly" | "Unlocked" | "Blocked" | AssetLockType | ShopIcon;

interface InventoryBundle {
  Group: AssetGroupName;
  Name: string;
}
interface InventoryItem extends InventoryBundle {
  Asset: Asset;
}

type SkillType = "Bondage" | "SelfBondage" | "LockPicking" | "Evasion" | "Willpower" | "Infiltration" | "Dressage";

interface Skill {
  Type: SkillType;
  Level: number;
  Progress: number;
  Ratio?: number;
  ModifierLevel?: number;
  ModifierTimeout?: number;
}

type ReputationType = "Dominant" | "Kidnap" | "ABDL" | "Gaming" | "Maid" | "LARP" | "Asylum" | "Gambling" | "HouseMaiestas" | "HouseVincula" | "HouseAmplector" | "HouseCorporis";

interface Reputation {
  Type: ReputationType;
  Value: number;
}

interface Ownership {
  Name: string;
  MemberNumber: number;
  Notes?: string;
  Stage: 0 | 1;
  Start: number;
}

interface Lovership {
  Name: string;
  MemberNumber?: number;
  Stage?: 0 | 1 | 2;
  Start?: number;
  BeginDatingOfferedByMemberNumber?: never;
  BeginEngagementOfferedByMemberNumber?: never;
  BeginWeddingOfferedByMemberNumber?: never;
}

type KeyboardEventListener = (event: KeyboardEvent) => boolean;
type MouseEventListener = (event: MouseEvent | TouchEvent) => void;
type MouseWheelEventListener = (event: WheelEvent) => void;
type ClipboardEventListener = (event: ClipboardEvent) => void;

type VoidHandler = () => void;
type ScreenLoadHandler = () => Promise<void>;
type ScreenUnloadHandler = VoidHandler;
type ScreenDrawHandler = VoidHandler;
type ScreenRunHandler = (time: number) => void;
type ScreenResizeHandler = (load: boolean) => void;
type ScreenExitHandler = VoidHandler;

interface ScreenFunctions {
  Run: ScreenRunHandler;
  MouseDown?: MouseEventListener;
  MouseUp?: MouseEventListener;
  MouseMove?: MouseEventListener;
  MouseWheel?: MouseWheelEventListener;
  Click: MouseEventListener;
  Load?: ScreenLoadHandler;
  Unload?: ScreenUnloadHandler;
  Draw?: ScreenDrawHandler;
  Resize?: ScreenResizeHandler;
  KeyDown?: KeyboardEventListener;
  KeyUp?: KeyboardEventListener;
  Paste?: ClipboardEventListener;
  Exit?: ScreenExitHandler;
}

// Character and Player Definitions
type ItemPermissionMode = "Default" | "Block" | "Limited" | "Favorite";

interface ItemPermissions {
  Hidden: boolean;
  Permission: ItemPermissionMode;
  TypePermissions: Record<string, ItemPermissionMode>;
}

interface ScriptPermission {
  permission: number;
}
type ScriptPermissionProperty = "Hide" | "Block";
type ScriptPermissionLevel = "Self" | "Owner" | "Lovers" | "Friends" | "Whitelist" | "Public";
type ScriptPermissions = Record<ScriptPermissionProperty, ScriptPermission>;

interface DialogLine {
  Stage: string;
  NextStage: string;
  Option: string;
  Result: string;
  Function: string;
  Prerequisite: string;
  Group: string;
  Trait: string;
}

interface DialogInfo<T extends ModuleType> {
  module: T;
  screen: ModuleScreens[T];
  name: string;
}

declare namespace DialogLeave {
  interface Options {
    reload?: boolean;
  }
}

interface PrivateCharacterData {
  Name: string;
  Love: number;
  Title: TitleName;
  Trait: NPCTrait[];
  Cage: boolean;
  Owner: string;
  Lover: string;
  AssetFamily: "Female3DCG";
  Appearance: AppearanceBundle;
  AppearanceFull: AppearanceBundle;
  ArousalSettings: Character["ArousalSettings"];
  Event: NPCEvent[];
  FromPandora?: boolean;
}

interface Character {
  ID: number;
  CharacterID: string;
  Type: CharacterType;
  AccountName: string;
  DialogInfo?: DialogInfo<any>;
  OnlineID?: string;
  AssetFamily: IAssetFamily;
  Name: string;
  Nickname?: string;
  Owner: string;
  Lover: string;
  Money: number;
  Inventory: InventoryItem[];
  InventoryData?: string;
  Appearance: Item[];
  _Stage: string;
  get Stage(): string;
  set Stage(value: string);
  _CurrentDialog: string;
  ClickedOption: null | string;
  get CurrentDialog(): string;
  set CurrentDialog(value: string);
  Dialog: DialogLine[];
  Reputation: Reputation[];
  Skill: Skill[];
  readonly ActiveExpression: (
    Partial<Record<ExpressionGroupName, ExpressionName>> & {
      setWithoutReload(key: ExpressionGroupName, value: ExpressionName): void;
      deleteWithoutReload(key: ExpressionGroupName): void;
    }
  );
  get Pose(): readonly AssetPoseName[];
  set Pose(value: readonly AssetPoseName[]);
  get ActivePose(): readonly AssetPoseName[];
  set ActivePose(value: readonly AssetPoseName[]);
  get AllowedActivePose(): readonly AssetPoseName[];
  set AllowedActivePose(value: readonly AssetPoseName[]);
  get DrawPose(): readonly AssetPoseName[];
  set DrawPose(value: readonly AssetPoseName[]);
  PoseMapping: Partial<Record<AssetPoseCategory, AssetPoseName>>;
  ActivePoseMapping: Partial<Record<AssetPoseCategory, AssetPoseName>>;
  AllowedActivePoseMapping: Partial<Record<AssetPoseCategory, AssetPoseName[]>>;
  DrawPoseMapping: Partial<Record<AssetPoseCategory, AssetPoseName>>;
  Effect: EffectName[];
  Tints: ResolvedTintDefinition[];
  Attribute: AssetAttribute[];
  FocusGroup: AssetItemGroup | null;
  Canvas: HTMLCanvasElement | null;
  CanvasBlink: HTMLCanvasElement | null;
  MustDraw: boolean;
  BlinkFactor: number;
  AllowItem: boolean;
  PermissionItems: Partial<Record<`${AssetGroupName}/${string}`, ItemPermissions>>;
  HeightModifier: number;
  MemberNumber?: number;
  AllowedInteractions: AllowedInteractions;
  Ownership: Ownership | null;
  Lovership: Lovership[];
  ExpressionQueue?: ExpressionQueueItem[];
  CanTalk: () => boolean;
  CanWalk: () => boolean;
  CanKneel: (minimumStatus?: PoseChangeStatus) => boolean;
  CanInteract: () => boolean;
  CanChangeOwnClothes: () => boolean;
  CanChangeClothesOn: (C: Character) => boolean;
  IsRestrained: () => boolean;
  IsBlind: () => boolean;
  IsEnclose: () => boolean;
  IsChaste: () => boolean;
  IsVulvaChaste: () => boolean;
  IsBreastChaste: () => boolean;
  IsButtChaste: () => boolean;
  IsEgged: () => boolean;
  IsOwned: () => "online" | "npc" | "ggts" | "player" | false;
  IsOwnedByCharacter: (C: Character) => boolean;
  IsOwnedByMemberNumber: (memberNumber: number) => boolean;
  IsFullyOwned: () => boolean;
  OwnerName: () => string;
  OwnerNumber: () => number;
  HasOwnerNotes: () => boolean;
  IsOwnedByPlayer: () => boolean;
  IsFullyOwnedByPlayer: () => boolean;
  OwnedSince: () => number;
  OwnedSinceMs: () => number;
  IsOwner: () => boolean;
  IsKneeling: () => boolean;
  IsStanding: () => boolean;
  IsNaked: () => boolean;
  IsDeaf: () => boolean;
  IsGagged: () => boolean;
  HasNoItem: () => boolean;
  IsLoverOfCharacter: (C: Character) => boolean;
  IsLoverOfMemberNumber: (memberNumber: number) => boolean;
  LoverName: () => string;
  IsLoverOfPlayer: () => boolean;
  GetLoversNumbers(MembersOnly: true): number[];
  GetLoversNumbers(MembersOnly: false): (number | string)[];
  GetLoversNumbers(MembersOnly?: boolean): (number | string)[];
  GetLovership: (MembersOnly?: boolean) => Lovership[];
  HeightRatio: number;
  HasHiddenItems: boolean;
  SavedColors: HSVColor[];
  GetBlindLevel: (eyesOnly?: boolean) => number;
  GetBlurLevel: () => number;
  IsLocked: () => boolean;
  IsMounted: () => boolean;
  IsPlugged: () => boolean;
  IsShackled: () => boolean;
  IsSlow: () => boolean;
  GetSlowLevel: () => number;
  IsMouthBlocked: () => boolean;
  IsMouthOpen: () => boolean;
  IsVulvaFull: () => boolean;
  IsAssFull: () => boolean;
  IsFixedHead: () => boolean;
  GetDeafLevel: () => number;
  CanPickLocks: () => boolean;
  IsEdged: () => boolean;
  IsPlayer: () => this is PlayerCharacter;
  get X(): number | null;
  get Y(): number | null;
  set X(X: number);
  set Y(Y: number);
  get Position(): ChatRoomMapPos | null;
  set Position({ X, Y }: ChatRoomMapPos);
  IsBirthday: () => boolean;
  IsSiblingOfCharacter: (C: Character) => boolean;
  IsFamilyOfPlayer: () => boolean;
  IsInFamilyOfMemberNumber: (MemberNum: number) => boolean;
  IsOnline: () => this is Character;
  IsNpc: () => this is NPCCharacter;
  IsSimple: () => boolean;
  GetDifficulty: () => number;
  IsSuspended: () => boolean;
  IsInverted: () => boolean;
  CanChangeToPose: (Pose: AssetPoseName) => boolean;
  GetClumsiness: () => number;
  HasEffect: (Effect: EffectName) => boolean;
  HasTints: () => boolean;
  GetTints: () => RGBAColor[];
  HasAttribute: (attribute: AssetAttribute) => boolean;
  DrawAppearance: Item[];
  AppearanceLayers?: Mutable<AssetLayer>[];
  AppearanceMasks?: AssetLayer[];
  Hooks: Map<CharacterHook, Map<string, () => void>> | null;
  RegisterHook: (hookName: CharacterHook, hookInstance: string, callback: () => void) => boolean;
  UnregisterHook: (hookName: CharacterHook, hookInstance: string) => boolean;
  RunHooks: (hookName: CharacterHook) => void;
  HeightRatioProportion?: number;
  GetGenders: () => AssetGender[];
  GetPronouns: () => CharacterPronouns;
  HasPenis: () => boolean;
  HasVagina: () => boolean;
  IsFlatChested: () => boolean;
  WearingCollar: () => boolean;
  HasOnGhostlist: (this: PlayerCharacter, target?: Character | number) => boolean;
  HasOnBlacklist: (target?: Character | number) => boolean;
  HasOnWhitelist: (target?: Character | number) => boolean;
  HasOnFriendlist: (this: PlayerCharacter, target?: Character | number) => boolean;
  IsGhosted: () => boolean;
  IsBlacklisted: () => boolean;
  IsWhitelisted: () => boolean;
  IsFriend: () => boolean;
  WhiteList: number[];
  BlackList: number[];
  ArousalSettings: ArousalSettingsType;
  AppearanceFull?: Item[];
  Title?: TitleName;
  LabelColor?: "" | HexColor;
  Creation?: number;
  Description?: string;
  OnlineSharedSettings?: CharacterOnlineSharedSettings;
  Game?: CharacterGameParameters;
  MapData?: ChatRoomMapData;
  RunScripts?: boolean;
  HasScriptedAssets?: boolean;
  Cage?: boolean;
  Difficulty?: { Level: number };
  ArousalZoom?: boolean;
  FixedImage?: string;
  Rule?: LogRecord[];
  Status?: string | null;
  StatusTimer?: number;
  Crafting: (CraftingItem | null)[];
  LastMapData?: ChatRoomMapData;
  CustomBackground?: string;
  Archetype?: NPCArchetype;
  Love?: number;
  WillRelease?(): boolean;
  OrgasmMeter?: number;
  OrgasmDone?: boolean;
  PrivateBed?: boolean;
  PrivateBedActivityTimer?: number;
  PrivateBedLeft?: number;
  PrivateBedTop?: number;
  PrivateBedMoveTimer?: number;
  PrivateBedAppearance?: string;
  KidnapWillpower?: number;
  KidnapMaxWillpower?: number;
  KidnapCard?: KidnapCard[];
  KidnapStat?: [number, number, number, number];
  Recruit?: number;
  RecruitOdds?: number;
  RandomOdds?: number;
  QuizLog?: number[];
  QuizFail?: number;
  AllowMove?: boolean;
  DrinkValue?: number;
  TriggerIntro?: boolean;
  FromPandora?: boolean;
  LastActivity?: PandoraPrisonActivity;
  House?: "" | MagicSchoolHouse;
  Friendship?: string;
  InterviewCleanCount?: number;
  ExpectedTraining?: number;
  CurrentTraining?: number;
  TrainingIntensity?: number;
  TrainingCount?: number;
  TrainingCountLow?: number;
  TrainingCountHigh?: number;
  TrainingCountPerfect?: number;
}

interface CharacterGameParameters {
  LARP?: GameLARPParameters;
  MagicBattle?: GameMagicBattleParameters;
  GGTS?: GameGGTSParameters;
  Poker?: GamePokerParameters;
  ClubCard?: GameClubCardParameters;
  MagicSchoolFindsAround?: GameMagicSchoolFindsAroundParameters;
  Prison?: GamePrisonParameters;
}

interface CharacterOnlineSharedSettings {
  AllowFullWardrobeAccess: boolean;
  BlockBodyCosplay: boolean;
  AllowPlayerLeashing: boolean;
  AllowRename: boolean;
  DisablePickingLocksOnSelf: boolean;
  GameVersion?: string;
  ItemsAffectExpressions: boolean;
  ScriptPermissions: ScriptPermissions;
  WheelFortune: string;
}

type NPCArchetype =
  | "MemberNew" | "MemberOld" | "Cosplay" | "Mistress" | "Slave" | "Maid" | "Guard"
  | "Victim" | "Target" | "Chest" | "Dominatrix" | "Nurse" | "Submissive" | "Mistress"
  | "Patient" | "Maid" | "Mistress" | "Maiestas" | "Vincula" | "Amplector" | "Corporis"
  | "AnimeGirl" | "Bunny" | "Succubus";

interface NPCCharacter extends Character {
  Archetype?: NPCArchetype;
  Trait?: NPCTrait[];
  Event?: NPCEvent[];
  Affection?: number;
  Domination?: number;
  TrialDone?: boolean;
  CanGetLongDuster?: boolean;
  CanGetForSaleSign?: boolean;
  OweFavor?: boolean;
  KissCount?: number;
  MasturbateCount?: number;
  ClothesTaken?: boolean;
}

interface KidnapCard {
  Move: number;
  Value?: number;
}

type PandoraPrisonActivity = "Beat" | "Water" | "Transfer" | "Quickie" | "Strip" | "Chastity" | "Tickle" | "ChangeBondage";

interface ExtensionSettings {
  [key: string]: any;
}

interface ControllerSettingsOld {
  ControllerA: number;
  ControllerB: number;
  ControllerX: number;
  ControllerY: number;
  ControllerStickUpDown: number;
  ControllerStickLeftRight: number;
  ControllerStickRight: number;
  ControllerStickDown: number;
  ControllerDPadUp: number;
  ControllerDPadDown: number;
  ControllerDPadLeft: number;
  ControllerDPadRight: number;
}

type DifficultyLevel = 0 | 1 | 2 | 3;

interface PlayerCharacter extends Character {
  MemberNumber: number;
  Nickname: string;
  LabelColor: "" | HexColor;
  Game: CharacterGameParameters;
  Description: string;
  Creation: number;
  Difficulty: {
    Level: DifficultyLevel;
    LastChange?: number;
  };
  Crafting: (null | CraftingItem)[];
  AllowedInteractions: AllowedInteractions;
  ChatSettings: ChatSettingsType;
  VisualSettings: VisualSettingsType;
  AudioSettings: AudioSettingsType;
  ControllerSettings: ControllerSettingsType;
  GameplaySettings: GameplaySettingsType;
  ImmersionSettings: ImmersionSettingsType;
  LastChatRoom?: ChatRoomSettings;
  RestrictionSettings: RestrictionSettingsType;
  OnlineSettings: PlayerOnlineSettings;
  GraphicsSettings: GraphicsSettingsType;
  NotificationSettings: NotificationSettingsType;
  OnlineSharedSettings: CharacterOnlineSharedSettings;
  GhostList: number[];
  Wardrobe: (ItemBundle[] | null)[];
  WardrobeCharacterNames: string[];
  SavedExpressions?: ({ Group: ExpressionGroupName; CurrentExpression?: ExpressionName }[] | null)[];
  SavedColors: HSVColor[];
  FriendList: number[];
  FriendNames: Map<number, string>;
  SubmissivesList: Set<number>;
  ChatSearchFilterTerms: never;
  GenderSettings: GenderSettingsType;
  ConfiscatedItems: { Group: AssetGroupName; Name: string }[];
  ExtensionSettings: ExtensionSettings;
  ChatSearchSettings: ChatRoomSearchSettings;
  KeybindingSettings: string;
  Infiltration?: InfiltrationType;
  KinkyDungeonKeybindings?: any;
  KinkyDungeonExploredLore?: any[];
  BCT?: any;
}

interface GenderSetting {
  Female: boolean;
  Male: boolean;
}

interface GenderSettingsType {
  HideShopItems: GenderSetting;
  AutoJoinSearch: GenderSetting;
  HideTitles: GenderSetting;
}

interface NotificationSettingsType {
  Beeps: NotificationSetting;
  ChatMessage: NotificationSetting & {
    Mention: boolean;
    Normal: boolean;
    Whisper: boolean;
    Activity: boolean;
  };
  ChatJoin: NotificationSetting & {
    Owner: boolean;
    Lovers: boolean;
    Friendlist: boolean;
    Subs: boolean;
  };
  Disconnect: NotificationSetting;
  Larp: NotificationSetting;
  Test: NotificationSetting;
}

interface GraphicsSettingsType {
  Font: GraphicsFontName;
  InvertRoom: boolean;
  DoBlindFlash: boolean;
  AnimationQuality: number;
  StimulationFlash: boolean;
  SmoothZoom: boolean;
  CenterChatrooms: boolean;
  AllowBlur: boolean;
  ShowFPS: boolean;
  MaxFPS: number;
  MaxUnfocusedFPS: number;
}

interface RestrictionSettingsType {
  BypassStruggle: boolean;
  SlowImmunity: boolean;
  BypassNPCPunishments: boolean;
  NoSpeechGarble: boolean;
}

interface ImmersionSettingsType {
  StimulationEvents: boolean;
  ReturnToChatRoom: boolean;
  ReturnToChatRoomAdmin: boolean;
  ChatRoomMapLeaveOnExit: boolean;
  SenseDepMessages: boolean;
  ChatRoomMuffle: boolean;
  BlindAdjacent: boolean;
  AllowTints: boolean;
  ShowUngarbledMessages: boolean;
}

type ControllerButton = typeof ControllerButton[keyof typeof ControllerButton];
type ControllerAxis = typeof ControllerAxis[keyof typeof ControllerAxis];

interface ControllerSettingsType {
  ControllerActive: boolean;
  ControllerSensitivity: number;
  ControllerDeadZone: number;
  Buttons: Record<ControllerButton, number>;
  Axis: Record<ControllerAxis, number>;
}

interface ChatSettingsType {
  ColorActions: boolean;
  ColorActivities: boolean;
  ColorEmotes: boolean;
  ColorNames: boolean;
  ColorTheme: ChatColorThemeType;
  DisplayTimestamps: boolean;
  EnterLeave: ChatEnterLeaveType;
  FontSize: ChatFontSizeType;
  MemberNumbers: ChatMemberNumbersType;
  MuStylePoses: boolean;
  ShowActivities: boolean;
  ShowAutomaticMessages: boolean;
  ShowBeepChat: boolean;
  ShowChatHelp: boolean;
  ShrinkNonDialogue: boolean;
  WhiteSpace: "" | "Preserve";
  CensoredWordsList: string;
  CensoredWordsLevel: number;
  PreserveChat: boolean;
  OOCAutoClose: boolean;
  DisableReplies: boolean;
  ShowFriendRequestMessages: boolean;
}

interface GameplaySettingsType {
  SensDepChatLog: SettingsSensDepName;
  BlindDisableExamine: boolean;
  DisableAutoRemoveLogin: boolean;
  ImmersionLockSetting: boolean;
  EnableSafeword: boolean;
  DisableAutoMaid: boolean;
  OfflineLockedRestrained: boolean;
}

interface AudioSettingsType {
  Volume: number;
  MusicVolume: number;
  PlayItem: boolean;
  PlayItemPlayerOnly: boolean;
  Notifications: boolean;
}

interface VisualSettingsType {
  ForceFullHeight: boolean;
  UseCharacterInPreviews: boolean;
  MainHallBackground?: string;
  PrivateRoomBackground?: string;
}

interface PlayerOnlineSettings {
  AutoBanBlackList: boolean;
  AutoBanGhostList: boolean;
  DisableAnimations: boolean;
  SearchFriendsFirst: boolean;
  SendStatus: boolean;
  ShowStatus: boolean;
  EnableAfkTimer: boolean;
  ShowRoomCustomization: 0 | 1 | 2 | 3;
  FriendListAutoRefresh: boolean;
  DefaultChatRoomBackground: string;
  SearchShowsFullRooms: never;
  BCX?: string;
  BCXDataCleared?: number;
}

interface InfiltrationType {
  Punishment?: {
    Minutes: number;
    Timer?: number;
    Background: string;
    Difficulty: number;
    FightDone?: boolean;
  };
  Perks?: string;
}

type NPCTraitType = "Dominant" | "Submissive" | "Violent" | "Peaceful" | "Horny" | "Frigid" | "Rude" | "Polite" | "Wise" | "Dumb" | "Serious" | "Playful";

interface NPCTrait {
  Name: NPCTraitType;
  Value: number;
}

type NPCEventType =
  | "LastInteraction" | "Wife" | "Fiancee" | "Girlfriend" | "PrivateRoomEntry"
  | "NPCCollaring" | "PlayerCollaring" | "NextGift" | "LastGift" | "Kidnap"
  | "NextKidnap" | "NPCBrainwashing" | "EndSubTrial" | "EndDomTrial"
  | "NextBed" | "NewCloth" | "RefusedActivity" | "SlaveMarketRent"
  | "AsylumSent" | "LastDecay";

interface NPCEvent {
  Name: NPCEventType;
  Value: number;
}

// Extended Items Engine
interface ElementMetaData {
  drawImage?: boolean;
  imagePath?: null | string;
  icon?: ThumbIcon;
  hidden?: boolean;
}

declare namespace ElementMetaData {
  interface Typed { drawImage: boolean; hidden: boolean; imagePath: null | string }
  interface Modular { drawImage: boolean; hidden: boolean; imagePath: null | string }
  interface Vibrating { drawImage: false; hidden: false; imagePath: null }
  interface Text {}
  interface VariableHeight { icon: ThumbIcon }
  type NoArch = ElementMetaData;
}

type ElementConfigData<MetaData extends ElementMetaData> = {
  position?: PartialRectTuple;
} & MetaData;

type ElementData<MetaData extends ElementMetaData> = {
  position: RectTuple;
} & MetaData;

interface ExtendedItemConfigDrawData<MetaData extends ElementMetaData> {
  elementData?: ElementConfigData<MetaData>[];
  itemsPerPage?: number;
}

interface VariableHeightConfigDrawData extends ExtendedItemConfigDrawData<{}> {
  elementData: { position: RectTuple; icon: ThumbIcon }[];
}

interface NoArchConfigDrawData extends ExtendedItemConfigDrawData<ElementMetaData> {
  elementData?: ElementData<ElementMetaData>[];
}

interface ExtendedItemDrawData<MetaData extends ElementMetaData> extends Required<ExtendedItemConfigDrawData<MetaData>> {
  elementData: ElementData<MetaData>[];
  pageCount: number;
  paginate: boolean;
}

type ExtendedItemHeaderCallback<DataType extends ExtendedItemData<any>> = (
  data: DataType,
  C: Character,
  item: Item,
) => string;

interface ExtendedItemDialog<DataType extends ExtendedItemData<any>, OptionType extends ExtendedItemOption> {
  header: string | ExtendedItemHeaderCallback<DataType>;
  module?: string;
  option?: string;
  chat?: string | ExtendedItemChatCallback<OptionType>;
  npc?: string | ExtendedItemNPCCallback<OptionType>;
}

interface ExtendedItemCapsDialog<DataType extends ExtendedItemData<any>, OptionType extends ExtendedItemOption> {
  Header?: string | ExtendedItemHeaderCallback<DataType>;
  Module?: string;
  Option?: string;
  Chat?: string | ExtendedItemChatCallback<OptionType>;
  Npc?: string | ExtendedItemNPCCallback<OptionType>;
}

type ExtendedItemScriptHookCallback<DataType extends ExtendedItemData<any>, T extends any[], RT = void> = (
  data: DataType,
  originalFunction: null | ((...args: T) => RT),
  ...args: T,
) => RT;

type ExtendedItemScriptHookCallbackNoNull<DataType extends ExtendedItemData<any>, T extends any[], RT = void> = (
  data: DataType,
  originalFunction: ((...args: T) => RT),
  ...args: T,
) => RT;

type ExtendedItemCallback<T extends any[], RT = void> = (...args: T) => RT;

interface ExtendedItemScriptHookStruct<DataType extends ExtendedItemData<any>, OptionType extends ExtendedItemOption> {
  init: ExtendedItemScriptHookCallbacks.Init<DataType>;
  load: ExtendedItemScriptHookCallbacks.Load<DataType>;
  draw: ExtendedItemScriptHookCallbacks.Draw<DataType>;
  click: ExtendedItemScriptHookCallbacks.Click<DataType>;
  exit: null | ExtendedItemScriptHookCallbacks.Exit<DataType>;
  validate: null | ExtendedItemScriptHookCallbacks.Validate<DataType, OptionType>;
  publishAction: null | ExtendedItemScriptHookCallbacks.PublishAction<DataType, OptionType>;
  setOption: null | ExtendedItemScriptHookCallbacks.SetOption<DataType, OptionType>;
  beforeDraw: null | ExtendedItemScriptHookCallbacks.BeforeDraw<DataType>;
  afterDraw: null | ExtendedItemScriptHookCallbacks.AfterDraw<DataType>;
  scriptDraw: null | ExtendedItemScriptHookCallbacks.ScriptDraw<DataType>;
}

interface ExtendedItemCapsScriptHooksStruct<DataType extends ExtendedItemData<any>, OptionType extends ExtendedItemOption> {
  Init?: ExtendedItemScriptHookCallbacks.Init<DataType>;
  Load?: ExtendedItemScriptHookCallbacks.Load<DataType>;
  Draw?: ExtendedItemScriptHookCallbacks.Draw<DataType>;
  Click?: ExtendedItemScriptHookCallbacks.Click<DataType>;
  Exit?: ExtendedItemScriptHookCallbacks.Exit<DataType>;
  Validate?: ExtendedItemScriptHookCallbacks.Validate<DataType, OptionType>;
  PublishAction?: ExtendedItemScriptHookCallbacks.PublishAction<DataType, OptionType>;
  SetOption?: ExtendedItemScriptHookCallbacks.SetOption<DataType, OptionType>;
  BeforeDraw?: ExtendedItemScriptHookCallbacks.BeforeDraw<DataType>;
  AfterDraw?: ExtendedItemScriptHookCallbacks.AfterDraw<DataType>;
  ScriptDraw?: ExtendedItemScriptHookCallbacks.ScriptDraw<DataType>;
}

interface ExtendedItemCallbackStruct<OptionType extends ExtendedItemOption> {
  init: ExtendedItemCallbacks.Init;
  load: ExtendedItemCallbacks.Load;
  draw: ExtendedItemCallbacks.Draw;
  click: ExtendedItemCallbacks.Click;
  exit?: ExtendedItemCallbacks.Exit;
  validate?: ExtendedItemCallbacks.Validate<OptionType>;
  publishAction?: ExtendedItemCallbacks.PublishAction<OptionType>;
  setOption?: ExtendedItemCallbacks.SetOption<OptionType>;
  beforeDraw?: ExtendedItemCallbacks.BeforeDraw;
  afterDraw?: ExtendedItemCallbacks.AfterDraw;
  scriptDraw?: ExtendedItemCallbacks.ScriptDraw;
}

declare namespace ExtendedItemCallbacks {
  type Load = ExtendedItemCallback<[]>;
  type Draw = ExtendedItemCallback<[]>;
  type Click = ExtendedItemCallback<[]>;
  type Exit = ExtendedItemCallback<[]>;
  type Validate<OptionType extends ExtendedItemOption> = ExtendedItemCallback<[C: Character, item: Item, newOption: OptionType, previousOption: OptionType, permitExisting?: boolean], string>;
  type PublishAction<OptionType extends ExtendedItemOption> = ExtendedItemCallback<[C: Character, item: Item, newOption: OptionType, previousOption: OptionType]>;
  type Init = ExtendedItemCallback<[C: Character, item: Item, push: boolean, refresh: boolean], boolean>;
  type SetOption<OptionType extends ExtendedItemOption> = ExtendedItemCallback<[C: Character, item: Item, newOption: OptionType, previousOption: OptionType, push: boolean, refresh: boolean]>;
  type AfterDraw<PersistentData extends Record<string, any> = Record<string, unknown>> = ExtendedItemCallback<[drawData: DynamicDrawingData<PersistentData>]>;
  type BeforeDraw<PersistentData extends Record<string, any> = Record<string, unknown>> = ExtendedItemCallback<[drawData: DynamicDrawingData<PersistentData>], DynamicBeforeDrawOverrides>;
  type ScriptDraw<PersistentData extends Record<string, any> = Record<string, unknown>> = ExtendedItemCallback<[drawData: DynamicScriptCallbackData<PersistentData>]>;
}

declare namespace ExtendedItemScriptHookCallbacks {
  type Load<DataType extends ExtendedItemData<any>> = ExtendedItemScriptHookCallbackNoNull<DataType, []>;
  type Draw<DataType extends ExtendedItemData<any>> = ExtendedItemScriptHookCallbackNoNull<DataType, []>;
  type Click<DataType extends ExtendedItemData<any>> = ExtendedItemScriptHookCallbackNoNull<DataType, []>;
  type Exit<DataType extends ExtendedItemData<any>> = ExtendedItemScriptHookCallback<DataType, []>;
  type Validate<DataType extends ExtendedItemData<any>, OptionType extends ExtendedItemOption> = ExtendedItemScriptHookCallback<DataType, [C: Character, item: Item, newOption: OptionType, previousOption: OptionType, permitExisting?: boolean], string>;
  type PublishAction<DataType extends ExtendedItemData<any>, OptionType extends ExtendedItemOption> = ExtendedItemScriptHookCallback<DataType, [C: Character, item: Item, newOption: OptionType, previousOption: OptionType]>;
  type Init<DataType extends ExtendedItemData<any>> = ExtendedItemScriptHookCallbackNoNull<DataType, [C: Character, item: Item, push: boolean, refresh: boolean], boolean>;
  type SetOption<DataType extends ExtendedItemData<any>, OptionType extends ExtendedItemOption> = ExtendedItemScriptHookCallback<DataType, [C: Character, item: Item, newOption: OptionType, previousOption: OptionType, push: boolean, refresh: boolean]>;
  type AfterDraw<DataType extends ExtendedItemData<any>, PersistentData extends Record<string, any> = Record<string, unknown>> = ExtendedItemScriptHookCallback<DataType, [drawData: DynamicDrawingData<PersistentData>]>;
  type BeforeDraw<DataType extends ExtendedItemData<any>, PersistentData extends Record<string, any> = Record<string, unknown>> = ExtendedItemScriptHookCallback<DataType, [drawData: DynamicDrawingData<PersistentData>], DynamicBeforeDrawOverrides>;
  type ScriptDraw<DataType extends ExtendedItemData<any>, PersistentData extends Record<string, any> = Record<string, unknown>> = ExtendedItemScriptHookCallback<DataType, [drawData: DynamicScriptCallbackData<PersistentData>]>;
}

type ExtendedItemChatSetting = "default" | TypedItemChatSetting | ModularItemChatSetting;

interface ExtendedItemData<OptionType extends ExtendedItemOption> {
  archetype: ExtendedArchetype;
  chatSetting: ExtendedItemChatSetting;
  dialogPrefix: ExtendedItemDialog<any, OptionType>;
  scriptHooks: ExtendedItemScriptHookStruct<any, OptionType>;
  asset: Asset;
  key: string;
  functionPrefix: string;
  dynamicAssetsFunctionPrefix: string;
  chatTags: CommonChatTags[];
  dictionary: ExtendedItemDictionaryCallback<OptionType>[];
  baselineProperty: PropertiesNoArray.Item | null;
  parentOption: null | ExtendedItemOption;
  drawData: ExtendedItemDrawData<{}>;
  allowEffect: readonly EffectName[];
  name: string;
}

interface ExtendedDataLookupStruct {
  [ExtendedArchetype.TYPED]: TypedItemData;
  [ExtendedArchetype.MODULAR]: ModularItemData;
  [ExtendedArchetype.VIBRATING]: VibratingItemData;
  [ExtendedArchetype.VARIABLEHEIGHT]: VariableHeightData;
  [ExtendedArchetype.TEXT]: TextItemData;
  [ExtendedArchetype.NOARCH]: NoArchItemData;
}

interface AssetOverrideHeight {
  Height: number;
  Priority: number;
  HeightRatioProportion?: number;
}

type AssetLayerOverridePriority = Record<string, number> | number;

interface AssetDefinitionProperties {
  Difficulty?: number;
  Attribute?: AssetAttribute[];
  OverrideHeight?: AssetOverrideHeight;
  HeightModifier?: number;
  OverridePriority?: AssetLayerOverridePriority;
  DefaultColor?: ItemColor;
  AllowActivity?: ActivityName[];
  AllowActivityOn?: AssetGroupName[];
  HideItem?: string[];
  HideItemExclude?: string[];
  Hide?: AssetGroupName[];
  Block?: AssetGroupItemName[];
  Effect?: EffectName[];
  Tint?: TintDefinition[];
  SetPose?: AssetPoseName[];
  AllowActivePose?: AssetPoseName[];
  SelfUnlock?: boolean;
  RemoveTimer?: number;
  Opacity?: number | number[];
  CustomBlindBackground?: string;
  Fetish?: FetishName[];
}

type PartialType = `${string}${number}`;
type TypeRecord = Record<string, number>;

interface ExpressionQueueItem {
  Time: number;
  Group: ExpressionGroupName;
  Expression: ExpressionName;
}

interface ItemPropertiesBase {
  Type?: null | string;
  TypeRecord?: TypeRecord;
  Expression?: ExpressionName;
  Mode?: VibratorMode;
  Intensity?: VibratorIntensity;
  State?: VibratorModeState;
  Modules?: number[];
}

interface ItemPropertiesCustom {
  LockedBy?: AssetLockType;
  LockMemberNumber?: number;
  LockMemberName?: string;
  LockMessage?: string;
  Password?: string;
  LockPickSeed?: string;
  CombinationNumber?: string;
  MemberNumberListKeys?: string;
  Hint?: string;
  LockSet?: boolean;
  RemoveItem?: boolean;
  RemoveOnUnlock?: boolean;
  ShowTimer?: boolean;
  EnableRandomInput?: boolean;
  MemberNumberList?: number[];
  InflateLevel?: 0 | 1 | 2 | 3 | 4;
  SuctionLevel?: 0 | 1 | 2 | 3 | 4;
  Text?: string;
  Text2?: string;
  Text3?: string;
  LockButt?: boolean;
  OpenPermission?: boolean;
  OpenPermissionArm?: boolean;
  OpenPermissionLeg?: boolean;
  OpenPermissionChastity?: boolean;
  BlockRemotes?: boolean;
  HeartRate?: number;
  AutoPunish?: 0 | 1 | 2 | 3;
  AutoPunishUndoTime?: number;
  AutoPunishUndoTimeSetting?: 120000 | 300000 | 900000 | 3600000 | 72000000;
  OriginalSetting?: 0 | 1 | 2 | 3;
  BlinkState?: boolean;
  Option?: ExtendedItemOption;
  PunishStruggle?: boolean;
  PunishStruggleOther?: boolean;
  PunishOrgasm?: boolean;
  PunishStandup?: boolean;
  PunishActivity?: boolean;
  PunishSpeech?: 0 | 1 | 2 | 3;
  PunishRequiredSpeech?: 0 | 1 | 2 | 3;
  PunishRequiredSpeechWord?: string;
  PunishProhibitedSpeech?: 0 | 1 | 2 | 3;
  PunishProhibitedSpeechWords?: string;
  NextShockTime?: number;
  PublicModeCurrent?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  PublicModePermission?: 0 | 1 | 2;
  TriggerValues?: string;
  AccessMode?: ItemVulvaFuturisticVibratorAccessMode;
  ShockLevel?: 0 | 1 | 2;
  InsertedBeads?: 1 | 2 | 3 | 4 | 5;
  ShowText?: boolean;
  TriggerCount?: number;
  OrgasmCount?: number;
  RuinedOrgasmCount?: number;
  TimeWorn?: number;
  TimeSinceLastOrgasm?: number;
  Iterations?: number;
  Revert?: boolean;
  Door?: boolean;
  Padding?: boolean;
  UnHide?: AssetGroupName[];
  Texts?: string[];
  TargetAngle?: number;
  PortalLinkCode?: string;
  DrawingTop?: TopLeft.ItemData;
  DrawingLeft?: TopLeft.ItemData;
}

interface ItemProperties extends ItemPropertiesBase, AssetDefinitionProperties, ItemPropertiesCustom {}

interface ItemPropertiesConfig extends Omit<ItemProperties, "DrawingTop" | "DrawingLeft"> {
  DrawingTop?: TopLeft.ItemDefinition;
  DrawingLeft?: TopLeft.ItemDefinition;
}

declare namespace PropertiesNoArray {
  type Item = { [k in keyof ItemProperties as NonNullable<ItemProperties[k]> extends readonly any[] ? never : k]: ItemProperties[k] };
  type Asset = { [k in keyof globalThis.Asset as NonNullable<globalThis.Asset[k]> extends readonly any[] ? never : k]: globalThis.Asset[k] };
  type Group = { [k in keyof AssetGroup as NonNullable<AssetGroup[k]> extends readonly any[] ? never : k]: AssetGroup[k] };
}
type PropertiesNoArray = PropertiesNoArray.Item & PropertiesNoArray.Asset & PropertiesNoArray.Group;

declare namespace PropertiesArray {
  type Item = { [k in keyof ItemProperties as NonNullable<ItemProperties[k]> extends readonly any[] ? k : never]: ItemProperties[k] };
  type Asset = { [k in keyof globalThis.Asset as NonNullable<globalThis.Asset[k]> extends readonly any[] ? k : never]: globalThis.Asset[k] };
  type Group = { [k in keyof AssetGroup as NonNullable<AssetGroup[k]> extends readonly any[] ? k : never]: AssetGroup[k] };
}
type PropertiesArray = PropertiesArray.Item & PropertiesArray.Asset & PropertiesArray.Group;

declare namespace PropertiesRecord {
  type Item = { [k in keyof ItemProperties as NonNullable<ItemProperties[k]> extends Record<string, any> ? k : never]: ItemProperties[k] };
  type Asset = { [k in keyof globalThis.Asset as NonNullable<globalThis.Asset[k]> extends Record<string, any> ? k : never]: globalThis.Asset[k] };
  type Group = { [k in keyof AssetGroup as NonNullable<AssetGroup[k]> extends Record<string, any> ? k : never]: AssetGroup[k] };
}
type PropertiesRecord = PropertiesRecord.Item & PropertiesRecord.Asset & PropertiesRecord.Group;

interface ModularItemData extends ExtendedItemData<ModularItemOption> {
  archetype: "modular";
  chatSetting: ModularItemChatSetting;
  typeCount: number;
  dialogPrefix: {
    header: string | ExtendedItemHeaderCallback<ModularItemData>;
    module: string;
    option: string;
    chat: string | ExtendedItemChatCallback<ModularItemOption>;
  };
  modules: ModularItemModule[];
  currentModule: string;
  pages: Record<string, number>;
  drawData: ExtendedItemDrawData<ElementMetaData.Modular>;
  drawFunctions: Record<string, () => void>;
  clickFunctions: Record<string, () => void>;
  scriptHooks: ExtendedItemScriptHookStruct<ModularItemData, ModularItemOption>;
  parentOption: null;
}

type ModularItemButtonDefinition = [ModularItemOption | ModularItemModule, ModularItemOption, string];

interface TypedItemData extends ExtendedItemData<TypedItemOption> {
  archetype: "typed";
  drawData: ExtendedItemDrawData<ElementMetaData.Typed>;
  options: TypedItemOption[];
  dialogPrefix: {
    header: string | ExtendedItemHeaderCallback<TypedItemData>;
    option: string;
    chat: string | ExtendedItemChatCallback<TypedItemOption>;
    npc: string | ExtendedItemNPCCallback<TypedItemOption>;
  };
  chatSetting: TypedItemChatSetting;
  scriptHooks: ExtendedItemScriptHookStruct<TypedItemData, TypedItemOption>;
  parentOption: null;
}

interface AppearanceUpdateParameters {
  C: Character;
  fromSelf: boolean;
  fromOwner: boolean;
  fromLover: boolean;
  fromFamily: boolean;
  permissions: ScriptPermissionLevel[];
  sourceMemberNumber: number;
}

type AppearanceDiffMap = Partial<Record<AssetGroupName, [before: Item, after: Item]>>;

interface ItemDiffResolution {
  item: Item | null;
  valid: boolean;
}

interface AppearanceValidationWrapper {
  appearance: Item[];
  valid: boolean;
}

interface VibratingItemData extends ExtendedItemData<VibratingItemOption> {
  archetype: "vibrating";
  drawData: ExtendedItemDrawData<ElementMetaData.Vibrating>;
  options: VibratingItemOption[];
  modeSet: VibratorModeSet[];
  dialogPrefix: {
    header: string | ExtendedItemHeaderCallback<VibratingItemData>;
    option: string;
    chat: string | ExtendedItemChatCallback<VibratingItemOption>;
  };
  scriptHooks: ExtendedItemScriptHookStruct<VibratingItemData, VibratingItemOption>;
  chatSetting: "default";
}

interface StateAndIntensity {
  State: VibratorModeState;
  Intensity: VibratorIntensity;
}

type VariableHeightGetHeightCallback = (property: ItemProperties) => number | null;
type VariableHeightSetHeightCallback = (property: ItemProperties, height: number, maxHeight: number, minHeight: number) => void;

interface VariableHeightData extends ExtendedItemData<VariableHeightOption> {
  archetype: "variableheight";
  maxHeight: number;
  minHeight: number;
  dialogPrefix: {
    header: string | ExtendedItemHeaderCallback<VariableHeightData>;
    chat: string | ExtendedItemChatCallback<VariableHeightOption>;
    option: string;
  };
  scriptHooks: ExtendedItemScriptHookStruct<VariableHeightData, VariableHeightOption>;
  getHeight: VariableHeightGetHeightCallback;
  setHeight: VariableHeightSetHeightCallback;
  chatSetting: "default";
  drawData: ExtendedItemDrawData<ElementMetaData.VariableHeight>;
}

interface TextItemData extends ExtendedItemData<TextItemOption> {
  archetype: "text";
  maxLength: TextItemRecord<number>;
  dialogPrefix: {
    header: string | ExtendedItemHeaderCallback<TextItemData>;
    chat: string | ExtendedItemChatCallback<TextItemOption>;
  };
  scriptHooks: ExtendedItemScriptHookStruct<TextItemData, TextItemOption>;
  chatSetting: "default";
  baselineProperty: PropertiesNoArray.Item;
  eventListeners: TextItemRecord<TextItemEventListener>;
  drawData: ExtendedItemDrawData<ElementMetaData.Text>;
  pushOnPublish: boolean;
  textNames: TextItemNames[];
  font: null | string;
}

type TextItemNames = keyof ItemProperties & ("Text" | "Text2" | "Text3");
type TextItemRecord<T> = Partial<Record<TextItemNames, T>>;
type TextItemEventListener = (C: Character, item: Item, name: TextItemNames, text: string) => void;

interface NoArchItemData extends ExtendedItemData<NoArchItemOption> {
  archetype: "noarch";
  scriptHooks: ExtendedItemScriptHookStruct<NoArchItemData, NoArchItemOption>;
  chatSetting: "default";
  baselineProperty: null | ItemProperties;
  drawData: ExtendedItemDrawData<ElementMetaData.NoArch>;
  dialogPrefix: {
    header: string | ExtendedItemHeaderCallback<NoArchItemData>;
    option?: string;
    chat?: string | ExtendedItemChatCallback<NoArchItemOption>;
  };
}

// Minigames & Systems
type StruggleKnownMinigames = "Strength" | "Flexibility" | "Dexterity" | "Loosen" | "LockPick";

interface StruggleMinigame {
  Setup: (C: Character, PrevItem: Item, NextItem: Item) => void;
  Draw: (C: Character) => void;
  HandleEvent?: (EventType: "KeyDown" | "Click", event: Event) => boolean;
  DisablingCraftedProperty?: CraftingPropertyType;
}

interface StruggleCompletionData {
  Progress: number;
  PrevItem: Item;
  NextItem?: Item;
  Skill: number;
  Attempts: number;
  Interrupted: boolean;
  Auto?: boolean;
}

type StruggleCompletionCallback = (character: Character, game: StruggleKnownMinigames, data: StruggleCompletionData) => void;

interface StruggleOnlineData {
  Timer: number;
  Start: number;
  LastRun: number;
  Progress: number;
  Difficulty: number;
  AllowLoosen: boolean;
  LoosenMode: boolean;
  Item: Item;
  NextAnim: number;
  StartExpressionEyes: ExpressionName;
  StartExpressionBlush: ExpressionName;
  StartExpressionMouth: ExpressionName;
  StartExpressionEyebrows: ExpressionName;
}

type PokerGameType = "TwoCards" | "TexasHoldem";
type PokerMode = "" | "DEAL" | "FLOP" | "TURN" | "RIVER" | "RESULT" | "END";
type PokerPlayerType = "None" | "Set" | "Character";
type PokerPlayerFamily = "None" | "Player" | "Illustration" | "Model";
type PokerHand = number[];

interface PokerAsset {
  Family: PokerPlayerFamily;
  Type: PokerPlayerType;
  Opponent: string[];
}

interface PokerPlayer {
  Type: PokerPlayerType;
  Family: PokerPlayerFamily;
  Name: string;
  Chip: number;
  Difficulty?: number;
  Hand?: PokerHand;
  HandValue?: number;
  Cloth?: Item;
  ClothLower?: Item;
  ClothAccessory?: Item;
  Panties?: Item;
  Bra?: Item;
  Character?: Character;
  Data?: TextCache;
  Image?: string;
  TextColor?: string;
  TextSingle?: TextCache;
  TextMultiple?: TextCache;
  Text?: string;
  WebLink?: string;
  Alternate?: number;
}

interface GamePokerParameters { Challenge?: string; }
interface GameClubCardParameters {
  Deck: string[];
  DeckName?: string[];
  Reward?: string;
  Status?: OnlineGameStatus;
  PlayerSlot?: number;
  Background?: string;
  CardBack?: number;
  Settings?: { AutoSpectate?: boolean; IsAnimation?: boolean };
}
interface GamePrisonParameters { Timer?: number; Role?: string; }
interface GameMagicSchoolFindsAroundParameters { KitsuneQuestProgress?: number; }

type OnlineGameStatus = "" | "Running";

interface GameLARPParameters {
  Status?: OnlineGameStatus;
  Class?: string;
  Team?: string;
  TimerDelay?: number;
  Level?: { Name: string; Level: number; Progress: number }[];
}

type GameLARPOptionName = "Pass" | "Seduce" | "Struggle" | "Hide" | "Cover" | "Strip" | "Tighten" | "RestrainArms" | "RestrainLegs" | "RestrainMouth" | "Silence" | "Immobilize" | "Detain" | "Dress" | "Costume" | "";

interface GameLARPOption {
  Name: GameLARPOptionName;
  Odds: number;
}

interface GameMagicBattleParameters {
  Status: OnlineGameStatus;
  House: "Independent" | "NotPlaying" | "HouseMaiestas" | "HouseVincula" | "HouseAmplector" | "HouseCorporis";
  TeamType: "FreeForAll" | "House";
}

interface GameGGTSParameters {
  Level: number;
  Time: number;
  Strike: number;
  Rule: string[];
}

type AudioSoundEffect = [string, number];
interface AudioEffect {
  Name: string;
  File: string | string[];
}
interface AudioChatAction {
  IsAction: (data: ServerChatRoomMessage) => boolean;
  GetSoundEffect: (data: ServerChatRoomMessage, metadata: IChatRoomMessageMetadata) => AudioSoundEffect | string | null;
}

// Canvas Drawing Pipelines
interface TextureAlphaMask {
  X: number;
  Y: number;
  Url: string;
  Mode: "destination-in" | "destination-out";
  Priority: number;
}

type DrawOptions = {
  Alpha?: number;
  SourcePos?: RectTuple;
  Width?: number;
  Height?: number;
  Invert?: boolean;
  Mirror?: boolean;
  Zoom?: number;
  HexColor?: HexColor;
  FullAlpha?: boolean;
  readonly AlphaMasks?: readonly RectTuple[];
  BlendingMode?: GlobalCompositeOperation;
  readonly TextureAlphaMask?: readonly TextureAlphaMask[];
};

type ClearRectCallback = (x: number, y: number, w: number, h: number) => void;
type DrawCanvasCallback = (img: HTMLImageElement | HTMLCanvasElement, x: number, y: number, alphaMasks?: RectTuple[], maskLayers?: TextureAlphaMask[]) => void;
type DrawImageCallback = (src: string, x: number, y: number, options?: DrawOptions) => void;
type DrawImageColorizeCallback = (src: string, x: number, y: number, options?: DrawOptions) => void;

interface CommonDrawCallbacks {
  clearRect: ClearRectCallback;
  clearRectBlink: ClearRectCallback;
  drawCanvas: DrawCanvasCallback;
  drawCanvasBlink: DrawCanvasCallback;
  drawImage: DrawImageCallback;
  drawImageBlink: DrawImageCallback;
  drawImageColorize: DrawImageColorizeCallback;
  drawImageColorizeBlink: DrawImageColorizeCallback;
}

interface DynamicDrawingData<T extends Record<string, any> = Record<string, unknown>> {
  C: Character;
  X: number;
  Y: number;
  CA: Item;
  GroupName: AssetGroupName;
  Color: BCColor;
  Opacity: number;
  Property: ItemProperties;
  A: Asset;
  G: string;
  AG: AssetGroup;
  L: string;
  Pose: AssetPoseName;
  LayerType: string;
  BlinkExpression: string;
  drawCanvas: DrawCanvasCallback;
  drawCanvasBlink: DrawCanvasCallback;
  AlphaMasks: RectTuple[];
  PersistentData: () => T;
}

interface DynamicBeforeDrawOverrides {
  Property?: ItemProperties;
  CA?: Item;
  GroupName?: AssetGroupName;
  Color?: BCColor;
  Opacity?: number;
  X?: number;
  Y?: number;
  LayerType?: string;
  L?: string;
  AlphaMasks?: RectTuple[];
  Pose?: AssetPoseName;
}

type DynamicDrawTextEffect = "burn";

interface DynamicScriptCallbackData<T extends Record<string, any> = Record<string, unknown>> {
  C: Character;
  Item: Item;
  PersistentData: () => T;
}

type InfiltrationMissionType = "Rescue" | "Kidnap" | "Retrieve" | "CatBurglar" | "ReverseMaid" | "Steal";
type InfiltrationTargetType = "NPC" | "USBKey" | "BDSMPainting" | "GoldCollar" | "GeneralLedger" | "SilverVibrator" | "DiamondRing" | "SignedPhoto" | "PandoraPadlockKeys";

interface InfiltrationMissionTarget {
  Type: InfiltrationTargetType;
  Name: string;
  Found?: boolean;
  Fail?: boolean;
  PrivateRoom?: boolean;
}

type PandoraDirection = "North" | "South" | "East" | "West";
type PandoraFloorDirection = "StairsUp" | "StairsDown" | PandoraDirection;
type PandoraFloors = "Ground" | "Second" | "Underground";

interface PandoraSpecialRoom {
  Floor: "Exit" | "Search" | "Rest" | "Paint";
}

interface PandoraBaseRoom {
  Floor: PandoraFloors;
  Background: string;
  Character: NPCCharacter[];
  Path: (PandoraBaseRoom | PandoraSpecialRoom)[];
  PathMap: PandoraBaseRoom[];
  Direction: string[];
  DirectionMap: PandoraFloorDirection[];
  SearchSquare?: { X: number; Y: number; W: number; H: number }[];
  ItemX?: number;
  ItemY?: number;
  Graffiti?: number;
}

type CraftingMode = "Slot" | "Name" | "Color" | "Extended" | "Tighten" | "OverridePriority";
type CraftingReorderType = "None" | "Select" | "Place";

interface CraftingItem {
  Name: string;
  MemberName?: string;
  MemberNumber?: number;
  Description: string;
  Effects: Partial<Record<CraftingPropertyType, number>>;
  Property?: CraftingPropertyType;
  Color: string;
  Lock: "" | AssetLockType;
  Item: string;
  Private: boolean;
  Type?: string | null;
  OverridePriority?: null | number;
  ItemProperty: ItemProperties | null;
  TypeRecord?: null | TypeRecord;
  Disabled?: boolean;
  DifficultyFactor?: number;
}

interface CraftingItemSelected {
  Name: string;
  Description: string;
  DifficultyFactor: number;
  Color: string;
  Assets: readonly Asset[];
  get Asset(): Asset | undefined;
  Effects: Partial<Record<CraftingPropertyType, number>>;
  Lock: Asset | null;
  Private: boolean;
  TypeRecord: null | TypeRecord;
  ItemProperty: ItemProperties;
  get OverridePriority(): undefined | AssetLayerOverridePriority;
  set OverridePriority(value: undefined | AssetLayerOverridePriority);
}

interface CratingValidationStruct {
  Validate: (craft: CraftingItem, asset: Asset | null, checkPlayerInventory?: boolean) => boolean;
  GetDefault: (craft: CraftingItem, asset: Asset | null, checkPlayerInventory?: boolean) => any;
  StatusCode: CraftingStatusType;
}

declare namespace CraftingJSON {
  export interface DataEncoded {
    version: 1;
    date: string;
    crafts: (null | string)[];
  }
  export interface DataDecoded extends Omit<DataEncoded, "crafts" | "date"> {
    crafts: (null | CraftingItem)[];
  }
  interface ParsingOutputBase {
    status: CraftingStatusType;
    errors?: Set<number>;
    data?: CraftingJSON.DataDecoded;
  }
  interface ParsingOutputErr extends ParsingOutputBase {
    status: 0;
    errors?: never;
    data?: never;
  }
  interface ParsingOutputOk extends Required<ParsingOutputBase> {
    status: 1 | 2;
  }
  export type ParsingOutput = ParsingOutputErr | ParsingOutputOk;
}

// Color Management
interface ColorGroup {
  name: null | string;
  layers: AssetLayer[];
  colorIndex: number;
}

interface ItemColorExitState extends Pick<ItemColorStateType, "colors" | "initialColors" | "defaultColors" | "opacity" | "initialOpacity" | "defaultOpacity" | "editOpacity"> {
  initialColors: BCColor[];
  initialOpacity: number[];
  defaultColors: BCColor[];
  defaultOpacity: number[];
}

type ItemColorExitListener = (colorState: ItemColorExitState, save: boolean, root: null | HTMLElement) => void;

interface ItemColorStateType {
  colorGroups: ColorGroup[];
  colors: BCColor[];
  initialColors: readonly BCColor[];
  defaultColors: readonly BCColor[];
  opacity: number[];
  initialOpacity: readonly number[];
  defaultOpacity: readonly number[];
  simpleMode: boolean;
  paginationButtonX: number;
  cancelButtonX: number;
  saveButtonX: number;
  colorPickerButtonX: number;
  colorDisplayButtonX: number;
  contentY: number;
  groupButtonWidth: number;
  pageSize: number;
  pageCount: number;
  editOpacity: boolean;
  drawImport: () => Promise<string>;
  drawExport: (data: string) => Promise<void>;
}

type HexColor = `#${string}`;
type BCColor = "Default" | "Black" | "White" | "Asian" | HexColor;

interface HSVColor {
  H: number;
  S: number;
  V: number;
}

interface ColorPickerColorInput {
  readonly colorString?: string;
  readonly hsv?: Readonly<HSVColor>;
  readonly opacity?: number;
}

interface ColorPickerInitOptions {
  root?: ElementHelp.ElementOrId;
  heading?: string | Element | readonly (string | Element)[];
  onInput?: (elem: HTMLFieldSetElement, ev: CustomEvent<{ source: "hue" | "opacity" | "tint" | "output" }>) => any;
  onExit?: ItemColorExitListener;
  colorState?: Prettify<Pick<ItemColorStateType, "editOpacity" | "opacity" | "colors"> & Partial<Pick<ItemColorStateType, "defaultOpacity" | "defaultColors">>>;
  disabled?: boolean;
  shape?: Readonly<RectTuple>;
  reset?: boolean;
  dispatch?: boolean;
}

// Logs, Preferences & Sub-Screens
interface LogRecord {
  Name: LogNameType[LogGroupType];
  Group: LogGroupType;
  Value: number;
}

type LogGroupType = keyof LogNameType;
type LogNameAdvanced = `BlockScreen${string}` | `BlockAppearance${string}` | `BlockItemGroup${string}` | `ForbiddenWords${string}`;

interface LogNameType {
  Arcade: "DeviousChallenge";
  Asylum: "Committed" | "Isolated" | "ForceGGTS" | "ReputationMaxed" | "Escaped";
  BadGirl: "Caught" | "Joined" | "Stolen" | "Hide";
  Cell: "Locked" | "KeyDeposit";
  College: "TeacherKey";
  Import: "BondageCollege";
  Introduction: "MaidOpinion" | "DailyJobDone";
  LockPick: "FailedLockPick";
  LoverRule: "BlockLoverLockSelf" | "BlockLoverLockOwner";
  MagicSchool: "Mastery";
  Maid: "JoinedSorority" | "LeadSorority" | "MaidsDisabled";
  MainHall: "IntroductionDone";
  Management: "ClubMistress" | "ClubSlave" | "ReleasedFromOwner" | "MistressWasPaid";
  "NPC-Amanda": "AmandaLover" | "AmandaCollared" | "AmandaCollaredWithCurfew" | "AmandaMistress";
  "NPC-AmandaSarah": "AmandaSarahLovers";
  "NPC-Jennifer": "JenniferLover" | "JenniferCollared" | "JenniferMistress" | "JenniferCollaredWithCurfew";
  "NPC-Sarah": "SarahLover" | "SarahCollared" | "SarahCollaredWithCurfew";
  "NPC-SarahIntro": "SarahWillBePunished" | "SarahCameWithPlayer";
  "NPC-Sidney": "SidneyLover" | "SidneyMistress" | "SidneyCollared" | "SidneyCollaredWithCurfew";
  "NPC-Julia": "Dominant" | "Submissive";
  "NPC-Yuki": "Dominant" | "Submissive";
  "NPC-Mildred": "Dominant" | "Submissive";
  OwnerRule: "BlockChange" | "BlockTalk" | "BlockEmote" | "BlockWhisper" | "BlockChangePose" | "BlockAccessSelf" | "BlockAccessOther" | "BlockKey" | "BlockFamilyKey" | "BlockOwnerLockSelf" | "BlockRemote" | "BlockRemoteSelf" | "BlockNickname" | "ReleasedCollar" | "BlockScreen" | "BlockAppearance" | "BlockItemGroup" | "ForbiddenWords" | "BlockTalkForbiddenWords" | LogNameAdvanced;
  Pony: "JoinedStable";
  PonyExam: "JoinedStable";
  PrivateRoom: "RentRoom" | "Expansion" | "SecondExpansion" | "Wardrobe" | "Cage" | "OwnerBeepActive" | "OwnerBeepTimer" | "Security" | "BedWhite" | "BedBlack" | "BedPink";
  Rule: "BlockChange" | "LockOutOfPrivateRoom" | "BlockCage" | "SleepCage";
  Sarah: "KidnapSophie";
  Shibari: "Training";
  SkillModifier: "ModifierDuration" | "ModifierLevel";
  SlaveMarket: "Auctioned";
  Trainer: "JoinedStable";
  TrainerExam: "JoinedStable";
}

interface FavoriteState {
  TargetFavorite: boolean;
  PlayerFavorite: boolean;
  Icon: FavoriteIcon;
  UsableOrder: DialogSortOrder;
  UnusableOrder: DialogSortOrder;
}

interface DialogInventoryItem extends Item {
  Worn: boolean;
  Icons: InventoryIcon[];
  SortOrder: string;
  Vibrating: boolean;
}

type DialogSelfMenuName = "Expression" | "Pose" | "SavedExpressions" | "OwnerRules";

type NotificationAudioType = 0 | 1 | 2;
type NotificationAlertType = 0 | 1 | 3 | 2;
type NotificationEventType = "ChatMessage" | "ChatJoin" | "Beep" | "Disconnect" | "Test" | "Larp";

interface NotificationSetting {
  AlertType: NotificationAlertType;
  Audio: NotificationAudioType;
}

interface NotificationData {
  body?: string;
  character?: Character;
  useCharAsIcon?: boolean;
  memberNumber?: number;
  characterName?: string;
  chatRoomName?: string;
  alarmWhenFocused?: boolean;
}

interface NotificationBeep {
  Message: string;
  Duration: number;
  ClickHandler?: (event: MouseEvent) => void;
  Silent?: boolean;
  Timer?: number;
}

interface ActivityEnjoyment {
  Name: ActivityName;
  Self: ArousalFactor;
  Other: ArousalFactor;
}

interface ArousalZone {
  Name: AssetGroupItemName;
  Factor: ArousalFactor;
  Orgasm: boolean;
}

interface ArousalFetish {
  Name: FetishName;
  Factor: ArousalFactor;
}

type ArousalFactor = 0 | 1 | 2 | 3 | 4;

interface ArousalSettingsType {
  Active: ArousalActiveName;
  Visible: ArousalVisibleName;
  ShowOtherMeter: boolean;
  AffectExpression: boolean;
  AffectStutter: ArousalAffectStutterName;
  VFX: SettingsVFXName;
  VFXVibrator: SettingsVFXVibratorName;
  VFXFilter: SettingsVFXFilterName;
  Progress: number;
  ProgressTimer: number;
  VibratorLevel: 0 | 1 | 2 | 3 | 4;
  ChangeTime: number;
  Activity: string;
  Zone: string;
  Fetish: string;
  OrgasmTimer?: number;
  OrgasmStage?: 0 | 1 | 2;
  OrgasmCount?: number;
  DisableAdvancedVibes: boolean;
}

interface PreferenceExtensionsSettingItem {
  Identifier: string;
  ButtonText: string | (() => string);
  Image?: string | (() => string);
  load?: () => void;
  click: () => void;
  run: () => void;
  unload?: () => void;
  exit: () => boolean | void;
  resize?: (onLoad: boolean) => void;
}

type PreferenceExtensionsMenuButtonInfo = {
  Button: string;
  Image?: string;
  click: () => void;
};

interface PreferenceChatDropdownOption {
  list: string[];
  current: () => string;
  onChange: (value: string) => void;
}

interface PreferenceChatCheckboxOption {
  label: string;
  check: () => boolean;
  click: () => void;
}

type WheelFortuneColor = "Blue" | "Gold" | "Gray" | "Green" | "Orange" | "Purple" | "Red" | "Yellow";

interface WheelFortuneOptionType {
  ID: string;
  Color: WheelFortuneColor;
  Script?: () => void;
}

type ClubCardTag = "All" | "Selected Cards" | "Event" | "NoGroup" | "Liability" | "Staff" | "Police" | "Criminal" | "Fetishist" | "Porn" | "Maid" | "Asylum" | "Dominant / Mistress" | "ABDL" | "College" | "Shibari" | "Pet / Owner" | "Kemonomimi" | "Submissive / Slave" | "Exhibitionist" | "Reward";

interface ClubCard {
  ID: number;
  UniqueID?: string;
  Name: string;
  ArrayIndex?: number;
  Type?: string;
  Title?: string;
  Text?: string;
  Prerequisite?: string;
  Reward?: string;
  RewardMemberNumber?: number;
  MoneyPerTurn?: number;
  FamePerTurn?: number;
  RequiredLevel?: number;
  Time?: number;
  ExtraTime?: number;
  ExtraDraw?: number;
  ExtraPlay?: number;
  Group?: string[];
  Location?: string;
  Negated?: boolean;
  Negating?: string;
  GlowTimer?: number;
  GlowColor?: string;
  EffectKey?: number;
  EffectType?: string;
  Revealed?: boolean;
  CanActive?: boolean;
  AnimationState?: string;
  DelayedAnimationState?: string;
  CurrentX?: number;
  CurrentY?: number;
  CurrentW?: number;
  IsVisible?: boolean;
  OnPlay?: (C: ClubCardPlayer) => void;
  BeforeTurnEnd?: (C: ClubCardPlayer) => void;
  AfterTurnEnd?: (C: ClubCardPlayer) => void;
  BeforeOpponentTurnEnd?: (C: ClubCardPlayer) => void;
  AfterOpponentTurnEnd?: (C: ClubCardPlayer) => void;
  CanPlay?: (C: ClubCardPlayer) => boolean;
  onPlayedCard?: (C: ClubCardPlayer, Card: ClubCard) => void;
  onOpponentPlayedCard?: (C: ClubCardPlayer, Card: ClubCard) => void;
  onLeaveClub?: (C: ClubCardPlayer) => void;
  turnStart?: (C: ClubCardPlayer) => void;
  onLevelUp?: (C: ClubCardPlayer) => void;
  onOpponentLevelUp?: (C: ClubCardPlayer) => void;
  onDrawCard?: (C: ClubCardPlayer) => void;
  onOpponentDrawCard?: (C: ClubCardPlayer) => void;
  onDrawAction?: (C: ClubCardPlayer) => void;
  onOpponentDrawAction?: (C: ClubCardPlayer) => void;
  onSteal?: (C: ClubCardPlayer) => void;
  StreetsTurnEnd?: (C: ClubCardPlayer) => void;
  onDiscardCard?: (C: ClubCardPlayer, Card: ClubCard) => void;
  onCancelNegation?: (C: ClubCardPlayer) => void;
  WhenDrawn?: (C: ClubCardPlayer) => void;
  OnActive?: (C: ClubCardPlayer) => void;
}

interface ClubCardPlayer {
  Character: Character;
  Control: string;
  Index: number;
  Sleeve: number;
  Deck: ClubCard[];
  FullDeck: ClubCard[];
  Hand: ClubCard[];
  Board: ClubCard[];
  Event: ClubCard[];
  RenderFullBoard: ClubCard[];
  DiscardPile: ClubCard[];
  Level: number;
  Money: number;
  Fame: number;
  LastFamePerTurn?: number;
  LastMoneyPerTurn?: number;
  ClubCardTurnCounter: number;
  CardsPlayedThisTurn: Record<number, ClubCard[]>;
}

interface ClubCardMessage {
  TextGetKey: string;
  MessageText?: string;
  MessageType: string;
  PlayerId: string;
  TurnCounter: number;
  Placeholders: { [key: string]: string | number };
  PlayerName?: string;
  SourcePlayer?: string;
  OpponentPlayer?: string;
}

interface ClubCardActiveAnimation {
  Card: ClubCard;
  OriginalCard?: ClubCard | null;
  StartTime: number;
  Duration: number;
  StartPosition: { x: number; y: number; w: number };
  EndPosition: { x: number; y: number; w: number };
  HideOriginal: boolean;
  KeepOriginalHidden: boolean;
  SafetyTimeout: number;
  OnComplete?: Function | null;
  Priority: number;
}

interface PreviewDrawOptions {
  C?: Character;
  Description?: string;
  Background?: string;
  Foreground?: string;
  Vibrating?: boolean;
  Border?: boolean;
  Hover?: boolean;
  HoverBackground?: string;
  Disabled?: boolean;
  Icons?: readonly InventoryIcon[];
  Craft?: CraftingItem;
  Width?: number;
  Height?: number;
}

interface ChatRoomView extends Pick<ScreenFunctions, "Run" | "MouseDown" | "MouseUp" | "MouseMove" | "MouseWheel" | "Click" | "Draw" | "KeyDown" | "KeyUp"> {
  Activate?: () => void;
  Deactivate?: () => void;
  Draw: () => void;
  DrawUi: () => void;
  SyncRoomProperties?: (data: ServerChatRoomSyncMessage) => void;
  CanStartWhisper?: (C: Character) => boolean;
  CanLeave?: () => boolean;
  Screenshot: () => void;
}

type ChatRoomMapType = "Always" | "Hybrid" | "Never";
type ChatRoomMapDirection = "" | "R" | "L" | "D" | "U";

type ChatRoomMapObjectType =
  | "FloorDecoration" | "FloorDecorationThemed" | "FloorDecorationParty"
  | "FloorDecorationCamping" | "FloorDecorationExpanding" | "FloorDecorationAnimal"
  | "FloorItem" | "FloorObstacle" | "FloorNumber" | "FloorLetter" | "FloorIcon"
  | "WallDecoration" | "WallPath" | "Banners";

type ChatRoomMapTileType = "Floor" | "FloorExterior" | "Wall" | "Water";

interface ChatRoomMapDoodad {
  ID: number;
  Style: string;
  OccupiedStyle?: "WoodOpen" | "MetalOpen";
  CanEnter?: (direction: ChatRoomMapDirection) => boolean;
  OnEnter?: () => void;
}

interface ChatRoomMapTile extends ChatRoomMapDoodad {
  Type: ChatRoomMapTileType;
  Transparency?: number;
  TransparencyCutoutHeight?: number;
  BlockVision?: boolean;
  BlockHearing?: boolean;
}

interface ChatRoomMapObject extends ChatRoomMapDoodad {
  Type: ChatRoomMapObjectType;
  Top?: number;
  Left?: number;
  Width?: number;
  Height?: number;
  Transparency?: number;
  TransparencyCutoutHeight?: number;
  Exit?: boolean;
  Unique?: boolean;
  AssetGroup?: AssetGroupItemName;
  AssetName?: string;
  BlockVision?: boolean;
  BlockHearing?: boolean;
  IsVisible?: () => boolean;
  BuildImageName?: (X: number, Y: number) => string;
}

interface ChatRoomMapEffectStaticLighting {
  Type: "StaticLighting";
  TypeId: 1;
  ID: number;
  Color: [r: number, g: number, b: number, a: number];
}

type ChatRoomMapEffect = ChatRoomMapEffectStaticLighting;

interface ChatRoomMapMovement {
  X: number;
  Y: number;
  Direction: "West" | "East" | "North" | "South";
  TimeStart: number;
  TimeEnd: number;
}

type ShopMode = "Buy" | "Sell" | "Preview" | "Color" | "Extended" | "Layering";
type ShopClothesMode = "Clothes" | "Underwear" | "Cosplay" | "Nude";
type ShopDropdownState = "None" | "Group" | "Pose";

interface ShopScreenFunctions extends Omit<Partial<ScreenFunctions>, "Draw"> {
  Draw(...coords: RectTuple): void;
  Coords: RectTuple;
  Mode: Set<ShopMode>;
}

interface ShopItem {
  readonly Asset: Asset;
  readonly SortPriority: number;
  readonly CannotBuy: boolean;
  readonly NeverSell: boolean;
  Buy: boolean;
}

type MaidQuartersMissionType = "ShibariDojo" | "IntroductionClass" | "Shop" | "Gambling" | "Prison";

interface LayeringExitOptions {
  screen?: string;
  callback?: (C: Character, item: Item) => void;
}

interface LayeringDisplay extends Rect {
  buttonGap: number;
}
