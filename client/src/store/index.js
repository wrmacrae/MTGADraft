import Vue from "vue";
import Vuex from "vuex";

import { Languages, MTGSets } from "../constants.js";
import { guid, shortguid } from "../helper.js";
import { getCookie } from "../cookies.js";

Vue.use(Vuex);

export default new Vuex.Store({
	state: {
		cards: null,

		userID: guid(),
		userName: getCookie("userName", "Anonymous"),
		useCollection: getCookie("useCollection", true),
		collection: {},
		socket: null,

		// Session status
		sessionID: getCookie("sessionID", shortguid()),
		sessionOwner: null,
		sessionOwnerUsername: null,
		ownerIsPlayer: true,
		isPublic: false,
		ignoreCollections: false,
		sessionUsers: [],
		boostersPerPlayer: 3,
		customBoosters: ["", "", ""],
		maxPlayers: 8,
		mythicPromotion: true,
		boosterContent: {
			common: 10,
			uncommon: 3,
			rare: 1,
		},
		colorBalance: true,
		maxDuplicates: {
			common: 8,
			uncommon: 4,
			rare: 2,
			mythic: 1,
		},
		foil: false,
		bots: 0,
		setRestriction: "",
		drafting: false,
		useCustomCardList: false,
		customCardList: [],
		burnedCardsPerRound: 0,
		maxTimer: 75,
		pickTimer: 75,
		draftLogRecipients: "everyone",
		draftLog: undefined,
		savedDraftLog: false,
		bracket: null,
		virtualPlayersData: null,
		booster: [],
		boosterNumber: 0,
		pickNumber: 0,
		winstonDraftState: null,

		publicSessions: [],
		selectedPublicSession: "",

		// Front-end options & data
		userOrder: [],
		hideSessionID: getCookie("hideSessionID", false),
		languages: Languages,
		language: getCookie("language", "en"),
		sets: MTGSets,
		pendingReadyCheck: false,
		cardOrder: getCookie("cardOrder", "DraggableCMC"),
		setsInfos: null,
		draftingState: null,
		pickOnDblclick: getCookie("pickOnDblclick", false),
		enableSound: getCookie("enableSound", true),
		enableNotifications:
			typeof Notification !== "undefined" &&
			Notification &&
			Notification.permission == "granted" &&
			getCookie("enableNotifications", false),
		notificationPermission: typeof Notification !== "undefined" && Notification && Notification.permission,
		selectedCard: null,
		burningCards: [],
		deck: [],
		sideboard: [],
		autoLand: true,
		lands: { W: 0, U: 0, B: 0, R: 0, G: 0 },
		deckColumn: [[], [], [], [], [], [], []],
		sideboardColumn: [[], [], [], [], [], [], []],

		displayBracket: false,
		displayAbout: false,
		// Draft Log Modal
		displayDraftLog: false,
		draftLogDisplayOptions: {
			detailsUserID: null,
			category: "Picks",
			textList: false,
		},
		// Collection Stats Modal
		showCollectionStats: false,
		statsMissingRarity: "rare",
		statsShowNonBooster: false,
		statsSelectedSet: "iko",

		// Chat
		currentChatMessage: "",
		displayChatHistory: false,
		messagesHistory: [],

		// Currently displayed modal
		modal: "None",
	},
	mutations: {},
	actions: {},
	modules: {},
});
