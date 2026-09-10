interface BCXVersion {
  major: number;
  minor: number;
  patch: number;
  extra?: string;
  dev?: boolean;
}

interface BCX_RuleStateAPI_Generic {
  readonly rule: string;
  readonly ruleDefinition: any;
  readonly condition: any;
  readonly inEffect: boolean;
  readonly isEnforced: boolean;
  readonly isLogged: boolean;
  readonly customData: any;
  readonly internalData: any;
  trigger(
    targetCharacter?: number | null,
    dictionary?: Record<string, string>,
  ): void;
  triggerAttempt(
    targetCharacter?: number | null,
    dictionary?: Record<string, string>,
  ): void;
}

interface BCX_RuleStateAPI<
  ID extends BCX_Rule,
> extends BCX_RuleStateAPI_Generic {
  readonly rule: ID;
  readonly ruleDefinition: RuleDisplayDefinition<ID>;
  readonly condition: ConditionsConditionData<"rules"> | undefined;
  readonly customData: ID extends keyof RuleCustomData
    ? RuleCustomData[ID] | undefined
    : undefined;
  readonly internalData: ID extends keyof RuleInternalData
    ? RuleInternalData[ID] | undefined
    : undefined;
}

interface BCX_CurseInfo {
  readonly active: boolean;
  readonly group: AssetGroupName;
  readonly asset: Asset | null;
  readonly color?: ItemColor;
  readonly curseProperty: boolean;
  readonly property?: ItemProperties;
  readonly craft?: CraftingItem;
}

interface BCX_Events {
  curseTrigger: {
    action: "remove" | "add" | "swap" | "update" | "color" | "autoremove";
    group: string;
  };
  ruleTrigger: {
    rule: BCX_Rule;
    triggerType: "trigger" | "triggerAttempt";
    targetCharacter: number | null;
  };
  bcxSubscreenChange: {
    inBcxSubscreen: boolean;
  };
  bcxLocalMessage: {
    message: string | Node;
    timeout?: number;
    sender?: number;
  };
  somethingChanged: {
    sender: number;
  };
}

interface BCX_ModAPI extends BCXEventEmitter<BCX_Events> {
  readonly modName: string;
  getRuleState<ID extends BCX_Rule>(rule: ID): BCX_RuleStateAPI<ID> | null;
  getCurseInfo(group: AssetGroupName): BCX_CurseInfo | null;
  sendQuery<T extends keyof BCX_queries>(
    type: T,
    data: BCX_queries[T][0],
    target: number | "Player",
    timeout?: number,
  ): Promise<BCX_queries[T][1]>;
}

interface BCX_ConsoleInterface {
  readonly version: string;
  readonly versionParsed: Readonly<BCXVersion>;
  getCharacterVersion(target?: number): string | null;
  readonly isDevel: boolean;
  getModApi(mod: string): BCX_ModAPI;
  inBcxSubscreen(): boolean;
}

interface Window {
  bcx?: BCX_ConsoleInterface;
  BCX_Loaded?: boolean;
}

type BCXEvent = Record<never, unknown>;
type BCXAnyEvent<T extends BCXEvent> = {
  [key in keyof T]: {
    event: key;
    data: T[key];
  };
}[keyof T];

interface BCXEventEmitter<T extends BCXEvent> {
  on<K extends keyof T>(s: K, listener: (v: T[K]) => void): () => void;
  onAny(listener: (value: BCXAnyEvent<T>) => void): () => void;
}

declare const BCX_VERSION: string;
declare const BCX_DEVEL: boolean;
declare const BCX_SAVE_AUTH: string;

type Satisfies<T extends U, U> = T;
type BCXSupporterType = undefined | "supporter" | "developer";

type BCX_DialogMenuButton =
  | "BCX_RemoteDisabled"
  | "BCX_UnlockDisabled"
  | "BCX_PickLockDisabled"
  | "BCX_LockDisabled"
  | "BCX_RemoveDisabled"
  | "BCX_StruggleDisabled"
  | "BCX_DismountDisabled"
  | "BCX_EscapeDisabled"
  | "BCX_ActivityDisabled"
  | "BCX_Search"
  | "BCX_SearchExit"
  | DialogMenuButton;

type BCX_BackgroundTag = "[BCX] Hidden" | BackgroundTag;

type BCX_Permissions =
  | "authority_edit_min"
  | "authority_grant_self"
  | "authority_revoke_self"
  | "authority_mistress_add"
  | "authority_mistress_remove"
  | "authority_owner_add"
  | "authority_owner_remove"
  | "authority_view_roles"
  | "log_view_normal"
  | "log_view_protected"
  | "log_configure"
  | "log_delete"
  | "log_praise"
  | "log_add_note"
  | "curses_normal"
  | "curses_limited"
  | "curses_global_configuration"
  | "curses_change_limits"
  | "curses_color"
  | "curses_view_originator"
  | "rules_normal"
  | "rules_limited"
  | "rules_global_configuration"
  | "rules_change_limits"
  | "rules_view_originator"
  | "commands_normal"
  | "commands_limited"
  | "commands_change_limits"
  | "exportimport_export"
  | "relationships_view_all"
  | "relationships_modify_self"
  | "relationships_modify_others"
  | "misc_cheat_allowactivities"
  | "misc_wardrobe_item_import";

type PermissionsBundle = Record<string, [boolean, number]>;

interface PermissionRoleBundle {
  mistresses: [number, string][];
  owners: [number, string][];
  allowAddMistress: boolean;
  allowRemoveMistress: boolean;
  allowAddOwner: boolean;
  allowRemoveOwner: boolean;
}

type BCX_LogCategory =
  | "permission_change"
  | "log_config_change"
  | "log_deleted"
  | "praise"
  | "user_note"
  | "curse_change"
  | "curse_trigger"
  | "rule_change"
  | "rule_trigger"
  | "command_change"
  | "had_orgasm"
  | "entered_public_room"
  | "entered_private_room"
  | "authority_roles_change"
  | "relationships_change";

interface CursedItemInfo {
  Name: string;
  curseProperty: boolean;
  Color?: string | string[];
  Difficulty?: number;
  Property?: ItemProperties;
  Craft?: CraftingItem;
  itemRemove?: true | undefined;
}

interface ConditionsCategoryKeys {
  curses: AssetGroupName;
  rules: BCX_Rule;
  commands: BCX_Command;
}

type ConditionsCategories = keyof ConditionsCategoryKeys;

interface ConditionsCategorySpecificData {
  curses: CursedItemInfo | null;
  rules: {
    enforce?: false;
    log?: false;
    customData?: Record<string, any>;
    internalData?: any;
  };
  commands: undefined;
}

interface ConditionsCategorySpecificGlobalData {
  curses: { itemRemove: boolean };
  rules: undefined;
  commands: undefined;
}

interface ConditionsCategorySpecificPublicData {
  curses: {
    Name: string;
    curseProperties: boolean;
    itemRemove: boolean;
  } | null;
  rules: {
    enforce: boolean;
    log: boolean;
    customData?: Record<string, any>;
  };
  commands: undefined;
}

interface ConditionsConditionRequirements {
  orLogic?: true;
  room?: {
    type: "public" | "private";
    inverted?: true;
  };
  roomName?: {
    name: string;
    inverted?: true;
  };
  role?: {
    role: any;
    inverted?: true;
  };
  player?: {
    memberNumber: number;
    inverted?: true;
  };
}

interface ConditionsConditionData<
  category extends ConditionsCategories = ConditionsCategories,
> {
  active: boolean;
  lastActive: boolean;
  data: ConditionsCategorySpecificData[category];
  timer?: number;
  timerRemove?: true | undefined;
  requirements?: ConditionsConditionRequirements;
  favorite?: true | undefined;
  addedBy?: number;
}

interface ConditionsConditionPublicDataBase {
  active: boolean;
  timer: number | null;
  timerRemove: boolean;
  requirements: ConditionsConditionRequirements | null;
  favorite: boolean;
}

interface ConditionsConditionPublicData<
  category extends ConditionsCategories = ConditionsCategories,
> extends ConditionsConditionPublicDataBase {
  data: ConditionsCategorySpecificPublicData[category];
  addedBy?: number;
}

type ConditionsCategoryRecord<
  category extends ConditionsCategories = ConditionsCategories,
> = Partial<
  Record<ConditionsCategoryKeys[category], ConditionsConditionData<category>>
>;
type ConditionsCategoryPublicRecord<
  category extends ConditionsCategories = ConditionsCategories,
> = Partial<
  Record<
    ConditionsCategoryKeys[category],
    ConditionsConditionPublicData<category>
  >
>;

interface ConditionsCategoryData<
  category extends ConditionsCategories = ConditionsCategories,
> {
  conditions: Partial<
    Record<ConditionsCategoryKeys[category], ConditionsConditionData<category>>
  >;
  limits: { [P in ConditionsCategoryKeys[category]]?: any };
  requirements: ConditionsConditionRequirements;
  timer?: number;
  timerRemove?: true | undefined;
  data: ConditionsCategorySpecificGlobalData[category];
}

interface ConditionsCategoryConfigurableData<
  category extends ConditionsCategories = ConditionsCategories,
> {
  requirements: ConditionsConditionRequirements;
  timer: number | null;
  timerRemove: boolean;
  data: ConditionsCategorySpecificGlobalData[category];
}

interface ConditionsCategoryPublicData<
  category extends ConditionsCategories = ConditionsCategories,
> extends ConditionsCategoryConfigurableData<category> {
  access_normal: boolean;
  access_limited: boolean;
  access_configure: boolean;
  access_changeLimits: boolean;
  highestRoleInRoom: any | null;
  conditions: ConditionsCategoryPublicRecord<category>;
  limits: { [P in ConditionsCategoryKeys[category]]?: any };
}

type ConditionsStorage = Partial<{
  [category in ConditionsCategories]: ConditionsCategoryData<category>;
}>;

type BCX_Rule =
  | "block_remoteuse_self"
  | "block_remoteuse_others"
  | "block_keyuse_self"
  | "block_keyuse_others"
  | "block_lockpicking_self"
  | "block_lockpicking_others"
  | "block_lockuse_self"
  | "block_lockuse_others"
  | "block_wardrobe_access_self"
  | "block_wardrobe_access_others"
  | "block_restrict_allowed_poses"
  | "block_creating_rooms"
  | "block_entering_rooms"
  | "block_leaving_room"
  | "block_freeing_self"
  | "block_tying_others"
  | "block_blacklisting"
  | "block_whitelisting"
  | "block_antiblind"
  | "block_difficulty_change"
  | "block_activities"
  | "block_mainhall_maidrescue"
  | "block_action"
  | "block_BCX_permissions"
  | "block_curses_self_by_others"
  | "block_rules_self_by_others"
  | "block_room_admin_UI"
  | "block_using_ggts"
  | "block_club_slave_work"
  | "block_using_unowned_items"
  | "block_changing_emoticon"
  | "block_ui_icons_names"
  | "alt_restrict_hearing"
  | "alt_restrict_sight"
  | "alt_eyes_fullblind"
  | "alt_field_of_vision"
  | "alt_blindfolds_fullblind"
  | "alt_always_slow"
  | "alt_set_leave_slowing"
  | "alt_control_orgasms"
  | "alt_secret_orgasms"
  | "alt_room_admin_transfer"
  | "alt_room_admin_limit"
  | "alt_set_profile_description"
  | "alt_set_nickname"
  | "alt_force_suitcase_game"
  | "alt_hearing_whitelist"
  | "alt_seeing_whitelist"
  | "alt_restrict_leashability"
  | "alt_hide_friends"
  | "alt_forced_summoning"
  | "alt_allow_changing_appearance"
  | "rc_club_owner"
  | "rc_lover_new"
  | "rc_lover_leave"
  | "rc_sub_new"
  | "rc_sub_leave"
  | "speech_specific_sound"
  | "speech_block_gagged_ooc"
  | "speech_block_ooc"
  | "speech_doll_talk"
  | "speech_ban_words"
  | "speech_ban_words_in_emotes"
  | "speech_forbid_open_talking"
  | "speech_limit_open_talking"
  | "speech_forbid_emotes"
  | "speech_limit_emotes"
  | "speech_restrict_whisper_send"
  | "speech_restrict_whisper_receive"
  | "speech_restrict_beep_send"
  | "speech_restrict_beep_receive"
  | "speech_greet_order"
  | "speech_block_antigarble"
  | "speech_replace_spoken_words"
  | "speech_force_retype"
  | "greet_room_order"
  | "greet_new_guests"
  | "farewell_on_slow_leave"
  | "speech_alter_faltering"
  | "speech_mandatory_words"
  | "speech_mandatory_words_in_emotes"
  | "speech_partial_hearing"
  | "speech_garble_while_talking"
  | "other_forbid_afk"
  | "other_track_time"
  | "other_constant_reminder"
  | "other_log_money"
  | "other_track_BCX_activation"
  | "setting_item_permission"
  | "setting_forbid_lockpicking"
  | "setting_forbid_SP_rooms"
  | "setting_forbid_safeword"
  | "setting_arousal_meter"
  | "setting_block_vibe_modes"
  | "setting_arousal_stutter"
  | "setting_show_afk"
  | "setting_allow_body_mod"
  | "setting_forbid_cosplay_change"
  | "setting_sensdep"
  | "setting_hide_non_adjecent"
  | "setting_blind_room_garbling"
  | "setting_relog_keeps_restraints"
  | "setting_leashed_roomchange"
  | "setting_room_rejoin"
  | "setting_plug_vibe_events"
  | "setting_allow_tint_effects"
  | "setting_allow_blur_effects"
  | "setting_upsidedown_view"
  | "setting_random_npc_events";

type RuleCustomData = Record<string, any>;
type RuleInternalData = Record<string, any>;

interface RuleDisplayDefinition<ID extends BCX_Rule = BCX_Rule> {
  name: string;
  type: any;
  shortDescription?: string;
  longDescription: string;
  keywords?: string[];
  triggerTexts?: {
    infoBeep?: string;
    attempt_infoBeep?: string;
    log?: string;
    attempt_log?: string;
    announce?: string;
    attempt_announce?: string;
  };
  defaultLimit: any;
  enforceable?: false;
  loggable?: false;
  dataDefinition?: any;
}

interface RuleDefinition<
  ID extends BCX_Rule = BCX_Rule,
> extends RuleDisplayDefinition<ID> {
  init?: (state: any) => void;
  load?: (state: any) => void;
  unload?: () => void;
  stateChange?: (state: any, newState: boolean) => void;
  tick?: (state: any) => boolean;
  internalDataValidate?: (data: unknown) => boolean;
  internalDataDefault?: () => any;
}

type BCX_Command =
  | "eyes"
  | "mouth"
  | "arms"
  | "legs"
  | "allfours"
  | "goandwait"
  | "say"
  | "forcesay"
  | "typetask"
  | "forcetypetask"
  | "cell"
  | "asylum"
  | "keydeposit"
  | "timeleft"
  | "servedrinks"
  | "orgasm"
  | "emoticon";

interface CommandDefinition<
  ID extends BCX_Command = BCX_Command,
> extends CommandDisplayDefinition {
  init?: (state: any) => void;
  load?: (state: any) => void;
  unload?: () => void;
  tick?: (state: any) => boolean;
  trigger: (
    argv: string[],
    sender: any,
    respond: (msg: string) => void,
    state: any,
  ) => boolean;
  autoCompleter?: (argv: string[], sender: any) => string[];
}

interface CommandDisplayDefinition {
  name: string;
  shortDescription?: string;
  longDescription: string;
  helpDescription: string;
  playerUsable?: boolean;
  defaultLimit: any;
}

interface RoomTemplate extends Omit<
  ServerChatRoomData,
  "Ban" | "MapData" | "Space" | "Character"
> {
  Locked?: never;
  Private?: never;
  Ban?: never;
  MapData?: never;
  Space?: never;
  Character?: never;
  AutoApply: true | undefined;
}

interface ModStorage {
  version: string;
  preset: any;
  menuShouldDisplayTutorialHelp?: true;
  chatShouldDisplayFirstTimeHelp?: true;
  chatroomIconHidden?: true;
  supporterHidden?: true;
  cheats: any[];
  disabledModules: any[];
  permissions: PermissionsBundle;
  owners: number[];
  mistresses: number[];
  log: any[];
  logConfig: any;
  typingIndicatorEnable: boolean;
  typingIndicatorHideBC: boolean;
  screenIndicatorEnable: boolean;
  conditions: ConditionsStorage;
  roomTemplates: (RoomTemplate | null)[];
  roomSearchAutoFill: string;
  relationships: any[];
  wardrobeDefaultExtended: boolean;
  compatibilityCheckerWarningIgnore?: string;
}

type BCX_beep_versionCheck = {
  version: string;
  devel: boolean;
  GameVersion: string;
  Source: string;
  UA: string;
};

type BCX_beep_versionResponse = {
  status: "unsupported" | "deprecated" | "newAvailable" | "current";
  supporterStatus?: BCXSupporterType;
  supporterSecret?: string;
};

type BCX_beeps = {
  versionCheck: BCX_beep_versionCheck;
  versionResponse: BCX_beep_versionResponse;
  supporterCheck: {
    memberNumber: number;
    status: BCXSupporterType;
    secret: string;
  };
  supporterCheckResult: {
    memberNumber: number;
    status: BCXSupporterType;
  };
  clearData: true;
};

type BCX_message_ChatRoomStatusEvent = {
  Type: string;
  Target: number | null;
};

interface BCX_effects {
  Effect: EffectName[];
}

type BCX_message_hello = {
  version: string;
  request: boolean;
  effects?: Partial<BCX_effects>;
  typingIndicatorEnable?: boolean;
  screenIndicatorEnable?: boolean;
  supporterStatus?: BCXSupporterType;
  supporterSecret?: string;
};

type BCX_message_query = {
  id: string;
  query: keyof BCX_queries;
  data?: any;
};

type BCX_message_queryAnswer = {
  id: string;
  ok: boolean;
  data?: any;
};

type BCX_messages = {
  ChatRoomStatusEvent: BCX_message_ChatRoomStatusEvent;
  hello: BCX_message_hello;
  goodbye: undefined;
  query: BCX_message_query;
  queryAnswer: BCX_message_queryAnswer;
  somethingChanged: undefined;
};

type BCX_logAllowedActions = {
  delete: boolean;
  configure: boolean;
  praise: boolean;
  leaveMessage: boolean;
};

type BCX_queries = Record<string, [any, any]>;
