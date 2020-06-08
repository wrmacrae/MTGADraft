<!DOCTYPE HTML>
<html lang="en-US">
<head>
	<meta charset="UTF-8">
	<title>MTGA Draft</title>
	<meta name="description" content="Draft with your friends using your Magic Arena card collection.">
	<meta name="keywords" content="Magic, Arena, Magic the Gathering, MTG, Magic Arena, MTGA, Booster, Limited, Sealed, Draft, Friend, Direct Challenge">
	<meta property="og:title" content="MTGA Draft">
	<meta property="og:type" content="website">
	<meta property="og:url" content="https://mtgadraft.herokuapp.com/">
	<meta property="og:image" content="https://upload.wikimedia.org/wikipedia/en/a/aa/Magic_the_gathering-card_back.jpg">
	<meta property="og:description" content="Draft with your friends using your Magic Arena card collection.">
	<meta property="og:site_name" content="MTGA Draft">

	<link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.8.2/css/all.css" integrity="sha384-oS3vJWv+0UjzBfQzYUhtDYW+Pj2yciDJxpsK1OYPAYjqT085Qq/1cq5FLXAZQ7Ay" crossorigin="anonymous">
	<link rel="stylesheet" href="https://unpkg.com/vue-multiselect@2.1.0/dist/vue-multiselect.min.css">
	<link rel="stylesheet" href="css/style.css" />
	<link rel="stylesheet" href="css/modal.css" />
	<link rel="stylesheet" href="css/tooltip.css" />

	<script type="text/x-template" id="modal-template">
	  <transition name="modal">
		<div class="modal-mask">
		  <div class="modal-wrapper" @click="close($event)">
			<div class="modal-container">

			  <div class="modal-header">
				<slot name="header">
				  ???
				</slot>
				<i @click="$emit('close')" class="fa fa-times fa-lg modal-default-button clickable" aria-hidden="true"></i>
			  </div>

			  <div class="modal-body">
				<slot name="body">
				  Loading...
				</slot>
			  </div>

			  <div class="modal-footer">
				<slot name="footer">
				</slot>
			  </div>
			</div>
		  </div>
		</div>
	  </transition>
	</script>
</head>
<body>
	<div id="main-vue">
		<div v-show="cards == undefined">
			<div class="loading"></div>
			<span>Loading cards data...</span>
		</div>
		
		<div id="view-controls" class="main-controls">
			<span>
				<label for="user-name">User Name</label><input type="text" id="user-name" name="user-name" v-model="userName" maxlength="50" />
				<div class="inline" v-tooltip="'Controls the display language of cards.'">
					<label for="language">Language</label>
					<select v-model="language" name="language">
						<option v-for="lang in languages" v-bind:value="lang.code">{{ lang.name }}</option>
					</select>
				</div>
			</span>
			<span>
				<label for="file-input">MTGA Collection</label><input type="file" id="file-input" @change="parseMTGALog" style="display:none" accept=".log" /><button onclick="document.querySelector('#file-input').click()" v-tooltip="'Import your collection by uploading your Player.log file.'">Upload <i v-if="hasCollection" class="fas fa-check green" v-tooltip="'Collection uploaded.'"></i></button>
				<button v-if="hasCollection" v-tooltip="'Display some statistics about your collection.'" @click="showCollectionStats = true">Stats</button>
				<div v-show="Object.keys(collection).length > 0" class="inline" v-tooltip="'Uncheck this to draft using every cards. Ignored when using a Custom Card List.'">
					<input type="checkbox" v-model="useCollection" id="useCollection"/><label for="useCollection">Restrict to Collection</label>
				</div>
			</span>
			<span>
				<i class="fas clickable" :class="{'fa-volume-mute': !enableSound, 'fa-volume-up': enableSound}" @click="enableSound = !enableSound" v-tooltip="'Toggle sound.'"></i>
				<div class="inline" v-tooltip="'Allows you to pick cards by double clicking.'">
					<input type="checkbox" v-model="pickOnDblclick" id="pickOnDblclick"><label for="pickOnDblclick">Pick on Double Click</label>
				</div>
				<span :class="{ disabled: notificationPermission == 'denied' }" v-tooltip="'Enable to get desktop notifications when your draft starts.'">
					<input type="checkbox" v-model="enableNotifications" @change="checkNotificationPermission" id="notification-input" /><label for="notification-input">Notifications</label>
				</span>
			</span>
			
			<span class="generic-container">
				<div v-show="publicSessions.length == 0" class="disable-warning">
					(No public sessions)
				</div>
				<span v-bind:class="{ disabled: drafting || publicSessions.length == 0 }" id="public-session-controls">
					<label for="public-sessions">Public sessions</label>
					<select id="public-sessions" v-model:value="selectedPublicSession">
						<option v-for="s in publicSessions" v-bind:value="s">
						{{ s }}
						</option>
					</select>
					<input type="button" value="Join" @click="joinPublicSession"/>
				</span>
			</span>
		</div>
		<div class="generic-container">
			<div id="limited-controls" class="main-controls" v-bind:class="{ disabled: drafting }">
				<span id="session-controls">
					<div class="inline" v-tooltip="'Share it with your friends!'">
						<label for="session-id" >Session ID</label>
						<input :type="hideSessionID ? 'password' : 'text'" id="session-id" v-model="sessionID" />
					</div>
					<i class="far fa-fw clickable" :class="hideSessionID ? 'fa-eye' : 'fa-eye-slash'" @click="hideSessionID = !hideSessionID" v-tooltip="'Show/Hide your session ID.'"></i>
					<i class="fas fa-share-square clickable" style="padding:4px" v-tooltip="'Share your Session ID'" @click="sessionURLToClipboard"></i>
					<i class="fas fa-project-diagram clickable" v-if="sessionOwner === userID && !bracket" @click="generateBracket" v-tooltip="'Generate Bracket.'"></i>
					<i class="fas fa-project-diagram clickable" v-if="bracket" @click="displayBracket = true" v-tooltip="'Display Bracket.'"></i>
					<i class="fas fa-user-check clickable" v-if="sessionOwner === userID" @click="readyCheck" v-tooltip="'Ready Check: Ask everyone in your session if they\'re ready to play.'"></i>
				</span>
				<span class="generic-container" :class="{ disabled: sessionOwner != userID }">
					<strong>Session options:</strong>
					<template v-if="useCustomCardList">
					Using Custom Card List ({{customCardList.length}} cards)
					</template>
					<template v-else>
					<div class="inline" v-tooltip="'Draft with all cards within set restriction disregarding players collections.'">
						<input type="checkbox" v-model="ignoreCollections" id="ignore-collections" /><label for="ignore-collections">Ignore Collections</label>
					</div>
					<div class="inline">
						<label for="set-restriction" v-tooltip="'Restricts to the selected sets. No selection means all cards present in Arena.'">Set(s)</label>
						<multiselect v-if="setsInfos" v-model="setRestriction" placeholder="All" :options="sets" :searchable="false" :allow-empty="true" :close-on-select="false" :multiple="true" select-label="" selected-label="" deselect-label="">
							<template slot="selection" slot-scope="{ values, search, isOpen }">
								<span class="multiselect__single" v-if="values.length == 1"><img class="set-icon" :src="setsInfos[values[0]].icon"> {{ setsInfos[values[0]].fullName }}</span>
								<span class="multiselect__single multiselect__single_nooverflow" v-if="values.length > 1">({{ values.length }})
									<img v-for="v in values" class="set-icon" :src="setsInfos[v].icon">
								</span>
							</template>
							<template slot="option" slot-scope="{ option , search  }"><span class="multiselect__option">{{ setsInfos[option].fullName }}</span></template>
						</multiselect>
					</div>
					</template>
				</span>
				<span class="generic-container" :class="{ disabled: sessionOwner != userID }">
					<strong>Draft:</strong>
					<div class="inline" v-tooltip="'Add some dumb bots to your draft.'">
						<label for="bots">Bots</label><input type="number" id="bots" class="small-number-input" min="0" max="7" step="1" v-model.number="bots" />
					</div>
					<div class="inline" v-tooltip="'Pick Timer (sec.). Zero means no timer.'">
						<label for="timer"><i class="fas fa-clock"></i></label>
						<input type="number" id="timer" class="small-number-input" min="0" max="180" step="15" v-model.number="maxTimer" />
					</div>
					<button @click="startDraft" v-tooltip="'Starts a Draft Session.'">Draft</button>
				</span>
				<span class="generic-container" :class="{ disabled: sessionOwner != userID }">
					<button @click="startWinstonDraft()" v-tooltip="'Starts a Winston Draft. This is a draft variant for only two players.'">Winston</button>
				</span>
				<span class="generic-container" :class="{ disabled: sessionOwner != userID }">
					<button @click="sealedDialog" v-tooltip="'Distributes boosters to everyone for a sealed session.'">Sealed</button>
				</span>
				<span v-tooltip="'More session options'" @click="showSessionOptionsDialog = !showSessionOptionsDialog" class="more-option clickable">More<i class="fas fa-bars"></i></span>
			</div>
			<div v-show="drafting" id="draft-in-progress">
				Draft in progress!
				<button v-if="sessionOwner == userID" class="stop" @click="stopDraft">Stop Draft</button>
			</div>
		</div>
		<div class="main-controls session-players">
			<div v-if="!ownerIsPlayer" class="generic-container" v-tooltip="'Non-playing session owner.'" style="margin-right: 0.5em">
				{{sessionOwnerUsername ? sessionOwnerUsername : '(Disconnected)'}} <i class="fas fa-crown subtle-gold" v-tooltip="sessionOwnerUsername ? `${sessionOwnerUsername} is the session's owner.` : 'Session owner is disconnected.'"></i>
				<div class="chat-bubble" :id="'chat-bubble-'+sessionOwner"></div>
			</div>
			<div>
				<span v-tooltip="'Maximum players can be adjusted in session options.'">Players ({{sessionUsers.length}}/{{maxPlayers}})</span>
				<i v-if="userID == sessionOwner && !drafting" class="fas fa-random clickable" @click="randomizeSeating" v-tooltip="'Randomize Seating Order'"></i>
			</div>
			<template v-if="!drafting">
				<draggable tag="ul" class="player-list" v-model="userOrder" @change="changePlayerOrder" :disabled="userID != sessionOwner || drafting">
					<li v-for="(id, idx) in userOrder" :key="id" :class="{draggable: userID === sessionOwner && !drafting, bot: userByID[id].isBot}" :set="user = userByID[id]" :data-userid="id">
						<span class="player-name">{{ user.userName }}</span>
						<template v-if="userID == sessionOwner">
							<i class="fas fa-chevron-left clickable move-player move-player-left" v-tooltip="`Move ${user.userName} to the left`" @click="movePlayer(idx, -1)"></i>
							<i class="fas fa-chevron-right clickable move-player move-player-right" v-tooltip="`Move ${user.userName} to the right`" @click="movePlayer(idx, 1)"></i>
						</template>
						<div class="status-icons">
							<i v-if="id === sessionOwner" class="fas fa-crown subtle-gold" v-tooltip="`${user.userName} is the session's owner.`"></i>
							<template  v-if="userID === sessionOwner && id != sessionOwner">
								<i class="fas fa-user-plus clickable subtle-gold" v-tooltip="`Give session ownership to ${user.userName}`" @click="setSessionOwner(id)"></i>
								<i class="fas fa-user-slash clickable red" v-tooltip="`Remove ${user.userName} from the session`" @click="removePlayer(id)"></i>
							</template>
							<template v-if="!useCustomCardList && !ignoreCollections">
								<template v-if="!user.collection">
									<i class="fas fa-book red" v-tooltip="user.userName + ' have not uploaded their collection yet.'"></i>
								</template>
								<template v-else-if="user.collection && !user.useCollection">
									<i class="fas fa-book yellow" v-tooltip="user.userName + ' have uploaded their collection, but are not using it.'"></i>
								</template>
								<template v-else>
									<i class="fas fa-book green" v-tooltip="user.userName + ' have uploaded their collection.'"></i>
								</template>
							</template>
							<template v-if="pendingReadyCheck">
								<template v-if="user.readyState == ReadyState.Ready">
									<i class="fas fa-check green" v-tooltip="`${user.userName} is ready!`"></i>
								</template>
								<template v-else-if="user.readyState == ReadyState.NotReady">
									<i class="fas fa-times red" v-tooltip="`${user.userName} is NOT ready!`"></i>
								</template>
								<template v-else-if="user.readyState == ReadyState.Unknown">
									<i class="fas fa-spinner fa-spin" v-tooltip="`Waiting on ${user.userName} to respond...`"></i>
								</template>
							</template>
						</div>
						<div class="chat-bubble" :id="'chat-bubble-'+id"></div>
					</li>
				</draggable>
			</template>
			<template v-else>
				<ul class="player-list">
					<li v-for="user in virtualPlayers" :class="{bot: user.isBot}" :data-userid="user.userID">
						<i class="fas fa-angle-double-left passing-order-left" v-show="(boosterNumber % 2) == 1" v-tooltip="'Passing order'"></i>
						<i class="fas fa-angle-double-right passing-order-right" v-show="(boosterNumber % 2) == 0" v-tooltip="'Passing order'"></i>
						<span class="player-name">{{ user.userName }}</span>
						<template v-if="!user.isBot && !user.disconnected">
						<div class="status-icons">
							<i v-if="user.userID === sessionOwner" class="fas fa-crown subtle-gold" v-tooltip="`${user.userName} is the session's owner.`"></i>
							<template  v-if="userID === sessionOwner && user.userID != sessionOwner">
								<i class="fas fa-user-plus clickable subtle-gold" v-if="ownerIsPlayer" v-tooltip="`Give session ownership to ${user.userName}`" @click="setSessionOwner(user.userID)"></i>
								<i class="fas fa-user-slash clickable red" v-tooltip="`Remove ${user.userName} from the session`" @click="removePlayer(user.userID)"></i>
							</template>
							<template v-if="winstonDraftState">
								<i v-show="user.userID === winstonDraftState.currentPlayer" class="fas fa-spinner fa-spin" v-tooltip="user.userName + ' is thinking...'"></i>
							</template>
							<template v-else>
								<template v-if="user.pickedThisRound">
									<i class="fas fa-check green" v-tooltip="user.userName + ' has picked a card.'"></i>
								</template>
								<template v-else>
									<i class="fas fa-spinner fa-spin" v-tooltip="user.userName + ' is thinking...'"></i>
								</template>
							</template>
						</div>
						<div class="chat-bubble" :id="'chat-bubble-'+user.userID"></div>
						</template>
					</li>
				</ul>
			</template>
			<div>
				<button @click="shareSavedDraftLog" v-show="savedDraftLog" v-tooltip="'Reveal and share previous draft log with players in your session.'">Share saved Draft Log</button>
				<button @click="displayDraftLog = !displayDraftLog" v-show="draftLog" v-tooltip="'Displays logs of your previous draft'">Draft Log</button>
			</div>
			<div class="chat">
				<form @submit.prevent="sendChatMessage">
					<input type="text" v-model="currentChatMessage" placeholder="Chat with players in your session."  maxlength="255" />
				</form>
				<i class="far fa-comments clickable" @click="displayChatHistory = !displayChatHistory" v-tooltip="'Display chat history.'"></i>
				<div class="chat-history" v-show="displayChatHistory" @focusout="displayChatHistory = false" tabindex="0">
					<template v-if="messagesHistory && messagesHistory.length > 0">
						<ol>
							<li v-for="msg in messagesHistory.slice().reverse()" :title="new Date(msg.timestamp)">
								<span class="chat-author">{{ msg.author in userByID ? userByID[msg.author].userName : "(Left)"}}</span><span class="chat-message">{{msg.text}}</span>
							</li>
						</ol>
					</template>
					<template v-else>
						No messages in chat history.
					</template>
				</div>
			</div>
		</div>
		<template v-if="drafting">
			<div v-show="draftingState == DraftState.Watching" class="draft-watching">
				<div class="draft-watching-state">
					<h1>Players are drafting...</h1>
					<div v-show="pickTimer >= 0"><i class="fas fa-clock"></i> {{ pickTimer }}</div>
					<div>Booster #{{boosterNumber}}, Pick #{{pickNumber}}</div>
				</div>
				<div v-if="draftLog && draftLog.sessionID === sessionID" class="draft-watching-live-log">
					<draft-log-live :draftlog="draftLog"></draft-log-live>
				</div>
			</div>
			<div v-show="draftingState == DraftState.Waiting" class="pick-waiting">
				<span class="spinner"></span><span v-show="pickTimer >= 0">(<i class="fas fa-clock"></i> {{ pickTimer }})</span> Waiting for other players to pick...
			</div>
			<div v-show="draftingState == DraftState.Picking" id="booster-container" class="container">
				<div id="booster-controls" class="controls">
					<h2>Your Booster</h2><span>Booster #{{ boosterNumber }}, Pick {{pickNumber}}</span><span v-show="pickTimer >= 0" :class="{redbg: pickTimer <= 10}" id="chrono"><i class="fas fa-clock"></i> {{ pickTimer }}</span>
					<input type="button" @click="pickCard" value="Confirm Pick" v-if="selectedCard != undefined && (burningCards.length === burnedCardsPerRound || booster.length === 1 + burningCards.length)"/>
					<span v-else>Pick a card<span v-if="cardsToBurnThisRound > 0"> and remove {{cardsToBurnThisRound}} cards from the pool ({{burningCards.length}}/{{cardsToBurnThisRound}})</span></span>
				</div>
				<div class="booster card-container">
					<div is="card" v-for="(card, index) in booster" v-bind:key="`${index}-${card.id}`" v-bind:card="card" v-bind:language="language" v-bind:selectcard="selectCard" v-bind:ondblclick="doubleClickCard" v-bind:selected="selectedCard === card" :canbeburned="burnedCardsPerRound > 0" :burned="burningCards.includes(card)" :burn="burnCard" :restore="restoreCard">
					</div>
				</div>
			</div>
			<!-- Winston Draft -->
			<div v-if="draftingState === DraftState.WinstonPicking || draftingState === DraftState.WinstonWaiting" id="booster-container" class="container">
				<div class="winston-status"><h2>Winston Draft</h2>
					<span>
						<template v-if="userID === winstonDraftState.currentPlayer">
							Your turn to pick a pile of cards!
						</template>
						<template v-else>
							Waiting on {{userByID[winstonDraftState.currentPlayer].userName}}...
						</template>
						There are {{winstonDraftState.remainingCards}} cards left in the main stack.
					</span>
				</div>
				<div class="winston-piles">
					<div v-for="(pile, index) in winstonDraftState.piles" class="winston-pile" :class="{'winston-current-pile': index === winstonDraftState.currentPile}">
						<template v-if="userID === winstonDraftState.currentPlayer && index === winstonDraftState.currentPile">
							<div class="card-column winstom-card-column">
								<figure is="card" v-for="card in pile" :key="card.uniqueID" v-bind:card="card" v-bind:language="language"></figure>
							</div>
							<div class="winston-current-pile-options">
								<button class="confirm" @click="winstonDraftTakePile">Take Pile</button>
								<button class="cancel" @click="winstonDraftSkipPile" v-if="winstonCanSkipPile">Skip Pile<span v-show="index === 2"> and Draw</span></button>
							</div>
						</template>
						<template v-else>
							<div class="card-column winstom-card-column">
								<div v-for="card in pile" class="card"><div class="card-placeholder"></div></div>
							</div>
							<div class="winston-pile-status" v-show="index === winstonDraftState.currentPile">
								{{userByID[winstonDraftState.currentPlayer].userName}} is looking at this pile...
							</div>
						</template>
					</div>
				</div>
			</div>
		</template>
		<div class="container" v-show="(deck !== undefined && deck.length > 0) || (drafting && draftingState !== DraftState.Watching) || this.draftingState == DraftState.Brewing">
			<div id="brewing-controls" class="controls">
				<h2>Deck ({{deck.length}})</h2>
				<label for="card-order">Card Display</label>
				<select v-model="cardOrder" name="card-order">
					<option value="DraggableCMC">Draggable</option>
					<option value="CMCColumns">CMC Columns</option>
					<option value="ColorColumns">Color Columns</option>
					<option value="CMC">Order by CMC</option>
					<option value="Color">Order by Color</option>
					<option value="Rarity">Order by Rarity</option>
				</select>
				<button v-if="deck.length > 0" type="button" @click="exportDeck">Export Deck to MTGA</button>
				<span v-show="draftingState == DraftState.Brewing">
					<input type="checkbox" id="autoLand" v-model="autoLand"><label for="autoLand" v-tooltip="'If set, will complete your deck to 40 cards with basic lands.'">Auto. Land</label>
					<label for="white-mana"><img src="img/mana/W.svg" class="mana-icon"></label><input class="small-number-input" type="number" id="white-mana" v-model.number="lands['W']" min="0" />
					<label for="blue-mana"><img src="img/mana/U.svg" class="mana-icon"></label><input class="small-number-input" type="number" id="blue-mana" v-model.number="lands['U']" min="0" />
					<label for="black-mana"><img src="img/mana/B.svg" class="mana-icon"></label><input class="small-number-input" type="number" id="black-mana" v-model.number="lands['B']" min="0" />
					<label for="red-mana"><img src="img/mana/R.svg" class="mana-icon"></label><input class="small-number-input" type="number" id="red-mana" v-model.number="lands['R']" min="0" />
					<label for="green-mana"><img src="img/mana/G.svg" class="mana-icon"></label><input class="small-number-input" type="number" id="green-mana" v-model.number="lands['G']" min="0" />
					{{totalLands}} basic lands for a total of {{deck.length + totalLands}} cards
				</span>
			</div>
			<div class="card-container" :class="['CMCColumns', 'ColorColumns', 'DraggableCMC'].includes(cardOrder) ? 'card-columns' : 'card-pool'">
				<div v-if="deck.length == 0" class="empty-warning">
					<h3>Your deck is currently empty!</h3>
					<p>Click on your cards to add them to your deck.</p>
				</div>
				<template v-if="cardOrder == 'DraggableCMC'">
					<draggable v-for="(column, colIdx) in deckColumn" :key="'deck'+colIdx" class="cmc-column drag-column" :list="column" group="cardColumn" @change="columnDeckChange">
					   <figure is="card" v-for="card in column" :key="card.uniqueID" v-bind:card="card" v-bind:language="language" v-bind:selectcard="deckToSideboard"></figure>
					</draggable>
					<div class="draggable-controls">
						<div @click="addDeckColumn" class="plus-column"><i class="fas fa-plus fa-2x"></i></div>
						<div v-show="deckColumn.length > 1" @click="removeDeckColumn" class="minus-column"><i class="fas fa-minus fa-2x"></i></div>
					</div>
				</template>
				<template v-else-if="cardOrder == 'CMCColumns'">
					<div v-for="cmc_column in deckColumnCMC" class="cmc-column">
						<figure is="card" v-for="(card, index) in cmc_column" v-bind:key="index" v-bind:card="card" v-bind:language="language" v-bind:selectcard="deckToSideboard"></figure>
					</div>
				</template>
				<template v-else-if="cardOrder == 'ColorColumns'">
					<div v-for="column in deckColumnColor" class="cmc-column" v-show="column.length > 0">
						<figure is="card" v-for="(card, index) in column" v-bind:key="index" v-bind:card="card" v-bind:language="language" v-bind:selectcard="deckToSideboard"></figure>
					</div>
				</template>
				<template v-else>
					<figure is="card" v-for="(card, index) in {'CMC': deckCMC, 'Color': deckColor, 'Rarity': deckRarity, '': deck}[cardOrder]" 
						v-bind:key="index" v-bind:card="card" v-bind:language="language" v-bind:selectcard="deckToSideboard"></figure>
				</template>
			</div>
		</div>
		<div v-show="(sideboard != undefined && sideboard.length > 0) || (drafting && draftingState !== DraftState.Watching) || draftingState == DraftState.Brewing" id="card-pool-container" class="container">
			<div id="card-pool-controls" class="controls">
				<h2>Sideboard (<span id="sideboard-length" style="display:inline-block">{{sideboard.length}}</span>)</h2>
			</div>
			<div class="card-container" :class="['CMCColumns', 'ColorColumns', 'DraggableCMC'].includes(cardOrder) ? 'card-columns' : 'card-pool'">
				<div v-if="sideboard.length == 0" class="empty-warning">
					<h3>Your sideboard is currently empty!</h3>
					<p>Click on cards in your deck to sideboard them.</p>
				</div>
				<template v-if="cardOrder == 'DraggableCMC'">
					<draggable v-for="(column, colIdx) in sideboardColumn" :key="'side'+colIdx" class="cmc-column drag-column" :list="column" group="cardColumn" @change="columnSideboardChange">
					   <figure is="card" v-for="card in column" v-bind:key="card.uniqueID" v-bind:card="card" v-bind:language="language" v-bind:selectcard="sideboardToDeck"></figure>
					</draggable>
					<div class="draggable-controls">
						<div @click="addSideboardColumn" class="plus-column"><i class="fas fa-plus fa-2x"></i></div>
						<div v-show="sideboardColumn.length > 1" @click="removeSideboardColumn" class="minus-column"><i class="fas fa-minus fa-2x"></i></div>
					</div>
				</template>
				<template v-else-if="cardOrder == 'CMCColumns'">
					<div v-for="cmc_column in sideboardColumnCMC" class="cmc-column">
						<figure is="card" v-for="(card, index) in cmc_column" v-bind:key="index" v-bind:card="card" v-bind:language="language" v-bind:selectcard="sideboardToDeck"></figure>
					</div>
				</template>
				<template v-else-if="cardOrder == 'ColorColumns'">
					<div v-for="column in sideboardColumnColor" class="cmc-column" v-show="column.length > 0">
						<figure is="card" v-for="(card, index) in column" v-bind:key="index" v-bind:card="card" v-bind:language="language" v-bind:selectcard="sideboardToDeck"></figure>
					</div>
				</template>
				<template v-else>
					<figure is="card" v-for="(card, index) in {'CMC': sideboardCMC, 'Color': sideboardColor, 'Rarity': sideboardRarity, '': sideboard}[cardOrder]" 
						v-bind:key="index" v-bind:card="card" v-bind:language="language" v-bind:selectcard="sideboardToDeck"></figure>
				</template>
			</div>
		</div>
		<div class="welcome" v-if="draftingState === undefined">
			<h1>Welcome to MTGADraft!</h1>
			<p class="important">
				Want to draft in MTGA with your friends? Noticed you currently can't do that natively? We're here for you!
				<ol class="important">
					<li>
						(Optional) Import your collection: Enable Detailed logs in game, the toggle can be found in Options > View Account > Detailed Logs (Plugin Support), importing your collection won't work without this activated.
						<a onclick="document.querySelector('#file-input').click()">Upload your MTGA logs</a> (you should find them at <tt>C:\Users\%username%\AppData\LocalLow\Wizards Of The Coast\MTGA\Player.log</tt>, note that <a href="https://support.microsoft.com/en-us/help/14201/windows-show-hidden-files" target="_blank">AppData is hidden by default</a>) to restrict the draft to the cards you actually own in the game.
					</li>
					<li>Use the controls on top of the page to enter your User Name and indicate your preferences.</li>
					<li>Share your session ID with your friends (or join their own session) and wait for your session owner to start a draft!</li>
				</ol>
			</p>
			<h2>Options</h2>
			<div style="display: flex">
				<div style="width: 50%">
					<strong>Session options</strong>
					(Only accessible to the session owner, shared by everyone in your session)
					<ul>
						<li><span class="option-name">Ignore Collections</span>: Draft with all cards of the selected set(s), ignoring player collections and preferences.</li>
						<li><span class="option-name">Set(s)</span>: Select one or multiple sets to draft using only with cards from these sets.</li>
						<li><span class="option-name">Bots</span>: Adds virtual players to your draft. They are <strong>pretty dumb</strong>, but they are doing their best :(</li>
						<li><span class="option-name">Pick Timer</span>: Maximum time in seconds allowed to pick a card in each booster. 0 means the timer is disabled.</li>
						</ul>
					Click on <span @click="showSessionOptionsDialog = !showSessionOptionsDialog" class="clickable">More <i class="fa-bars fa"></i></span> for some additional options:
					<ul>
						<li><span class="option-name">Public</span>: Flags your session as public. It will appear in the "Public Sessions" menu so anyone can directly join.</li>
						<li><span class="option-name">Color Balance</span>: If set, the system will attempt to smooth out the color distribution in each pack, as opposed to being completely random. (Also affects sealed and cube)</li>
						<li><span class="option-name">Custom card list</span>: Submit a custom card list (one English card name by line) to draft your own cube. (Collections are ignored in this mode) <a href="cubeformat.html" target="_blank">More information here</a></li>
						<li><span class="option-name">Foil</span>: If enabled, each pack will have a chance to contain a 'foil' card of any rarity in place of one common.</li>
					</ul>
				</div>
				<div style="width: 50%">
					<strong>Personal options</strong>
					<ul>
						<li><span class="option-name">Language</span>: Adjusts the display language of cards. (Only affects cards)</li>
						<li><span class="option-name">Restrict to Collection</span>: If unchecked, your collection will not limit the cards available in the selected sets. If every players unchecks this, you will draft using every cards. (Ignored if "Ignore Collections" is enabled in the session, or when using a Custom Card List)</li>
						<li><span class="option-name">Pick on Double Click</span>: Allows you to double click on booster cards during draft to pick without having to confirm.</li>
						<li><span class="option-name">Notifications</span>: If enabled, you will be notified when a draft is launched.</li>
						<li><span class="option-name">Session ID</span>: A unique identifier for your session, you can use any name, just make sure to use the same as your friends to play with them!</li>
						<li><span class="option-name">Card Display</span>: Adjusts the order of cards within a sealed pool or your drafted cards.</li>
					</ul>
				</div>
			</div>
		</div>
		<modal v-if="displayDraftLog && draftLog" @close="displayDraftLog = false">
			<h2 slot="header">
				Draft Log
				<span v-if="draftLog.sessionID">for Session '{{draftLog.sessionID}}'</span>
				<span v-if="draftLog.time">({{new Date(draftLog.time).toLocaleString()}})</span>
				<button type="button" @click="downloadLog">Download full log</button>
			</h2>
			<div slot="body">
				<p>Click on a player to display the details of their draft.</p>
				
				<div>
					<ul :class="{'player-table': extendedDraftLog.length <= 8, 'player-list': extendedDraftLog.length > 8}">
						<li v-for="log of extendedDraftLog" :class="{clickable: log.userName != '(empty)', selected: log.userID == draftLogDisplayOptions.detailsUserID}" @click="(_) => { if(log.userName != '(empty)') { draftLogDisplayOptions.detailsUserID = log.userID; } }">
							{{log.userName}}
							<span>
								<img src="img/mana/W.svg" class="mana-icon" v-if="log.colors['W'] >= 10" v-tooltip="log.colors['W']">
								<img src="img/mana/U.svg" class="mana-icon" v-if="log.colors['U'] >= 10" v-tooltip="log.colors['U']">
								<img src="img/mana/B.svg" class="mana-icon" v-if="log.colors['B'] >= 10" v-tooltip="log.colors['B']">
								<img src="img/mana/R.svg" class="mana-icon" v-if="log.colors['R'] >= 10" v-tooltip="log.colors['R']">
								<img src="img/mana/G.svg" class="mana-icon" v-if="log.colors['G'] >= 10" v-tooltip="log.colors['G']">
							</span>
						</li>
					</ul>
				</div>
				
				<div v-if="Object.keys(draftLog.users).includes(draftLogDisplayOptions.detailsUserID)" :set="log = draftLog.users[draftLogDisplayOptions.detailsUserID]">
					<h2>{{log.userName}}</h2>
					<select v-model="draftLogDisplayOptions.category">
						<option>Picks</options>
						<option>Cards<options>
						<option>Cards (CMC Columns)<options>
					</select>
					<button @click="exportSingleLog(log.userID)">Export in MTGA format</button>
					<button @click="downloadMPT(log.userID)">Download in MTGO format</button>
					<button @click="submitToMPT(log.userID)">Submit to MagicProTools</button></h1>
					
					<template v-if="draftLogDisplayOptions.category == 'Picks'">
						<div v-for="(pick, index) in log.picks">
							<h3>Pick {{index + 1}}: {{cards[pick.pick].name}}</h3>
							<draft-log-pick :pick="pick"></draft-log-pick>
						</div>
					</template>
					<template v-else-if="draftLogDisplayOptions.category == 'Cards (CMC Columns)'">
						<div class="card-container card-columns">
							<div v-for="cmc_column in idColumnCMC(log.cards)" class="cmc-column">
								<figure is="card" v-for="(card, index) in cmc_column" v-bind:key="index" v-bind:card="cards[card]" v-bind:language="language"></figure>
							</div>
						</div>
					</template>
					<template v-else>
						<input type="checkbox" name="draft-log-card-list" v-model="draftLogDisplayOptions.textList"><label for="draft-log-card-list">Show simple card list</label>
						<template v-if="draftLogDisplayOptions.textList">
							<ol class="draft-log-boosters-list">
								<li v-for="card in log.cards">{{cards[card].printed_name[language]}}</li>
							</ol>
						</template>
						<template v-else>
							<div class="card-container">
								<figure is="card" v-for="(card, index) in log.cards" v-bind:key="index" v-bind:card="cards[card]" v-bind:language="language"></figure>
							</div>
						</template>
					</template>
				</div>
			</div>
		</modal>
		<modal v-if="showCollectionStats" @close="showCollectionStats = false">
			<h2 slot="header">Collection Statistics</h2>
			<div slot="body" v-if="collectionStats !== undefined">
				Select set:
				<select v-model="statsSelectedSet">
					<option v-for="set in sets" v-bind:value="set">{{ collectionStats[set].fullName }}</option>
				</select>
				<div class="set-stats">
					<div v-for="set in sets" v-show="statsSelectedSet === set">
						<table>
							<caption>{{collectionStats[set].fullName}}</caption>
							<tr><th>Rarity</th><th>Unique</th><th>Total</th><th>Total Missing</th><th>Unique (Booster)</th><th>Missing From Boosters</th></tr>
							<tr>
								<td>Total</td>
								<td>{{collectionStats[set].cards.filter(c => c.count > 0).length}}/{{collectionStats[set].total.unique}}</td>
								<td>{{collectionStats[set].cardCount}}/{{4 * collectionStats[set]['total']['unique']}}</td>
								<td>{{4 * collectionStats[set]['total']['unique'] - collectionStats[set].cardCount}}</td>
								<td>{{collectionStats[set].cards.filter(c => c.in_booster && c.count > 0).length}}/{{collectionStats[set].cards.filter(c => c.in_booster).length}}</td>
								<td>-</td>
							</tr>
							<tr v-for="r in ['common', 'uncommon', 'rare', 'mythic']" v-if="collectionStats[set][r + 'Count'] && collectionStats[set]['total'][r + 'Count'] > 0">
								<td>{{r}}</td>
								<td>{{collectionStats[set][r].filter(c => c.count > 0).length}}/{{collectionStats[set]['total'][r + 'Count']}}</td>
								<td>{{collectionStats[set][r + 'Count']}}/{{4 * collectionStats[set]['total'][r + 'Count']}}</td>
								<td>{{4 * collectionStats[set]['total'][r + 'Count'] - collectionStats[set][r + 'Count']}}</td>
								<td>{{collectionStats[set][r].filter(c => c.in_booster && c.count > 0).length}}/{{collectionStats[set][r].filter(c => c.in_booster).length}}</td>
								<td>{{4 * collectionStats[set][r].filter(c => c.in_booster).length - collectionStats[set][r].filter(c => c.in_booster).reduce((acc, val) => acc + val.count, 0)}}</td>
							</tr>
						</table>
						<h3>Missing <select v-model="statsMissingRarity"><option value="common">Commons</option><option value="uncommon">Uncommons</option><option value="rare">Rares</option><option value="mythic">Mythics</option></select> <input type="checkbox" id="show-non-booster" v-model="statsShowNonBooster"><label for="show-non-booster">Show non-booster cards</label></h3>
						<div class="card-container">
							<figure is="missingCard" v-for="(card, index) in collectionStats[set].cards.filter(c => c.rarity == statsMissingRarity && (statsShowNonBooster || c.in_booster) && c.count < 4)" v-bind:key="card.uniqueID" v-bind:card="card" v-bind:language="language"></figure>
						</div>
					</div>
				</div>
			</div>
		</modal>
		<modal v-if="showSessionOptionsDialog" @close="showSessionOptionsDialog = false">
			<h2 slot="header">Additional Session Options</h2>
			<div slot="body" class="session-options-container" :class="{disabled: userID != sessionOwner}">
				<div class="option-column">
					<div class="line" v-tooltip.left="{classes: 'option-tooltip', content: '<p>Share this session ID with everyone.</p>'}">
						<label for="is-public">Public</label>
						<div class="right">
							<input type="checkbox" v-model="isPublic" id="is-public" />
						</div>
					</div>
					<div class="line" v-tooltip.left="{classes: 'option-tooltip', content: '<p>Is the session owner participating in?</p>'}">
						<label for="is-owner-player">Session owner is playing</label>
						<div class="right">
							<input type="checkbox" v-model="ownerIsPlayer" id="is-owner-player" />
						</div>
					</div>
					<div class="line">
						<label for="max-players">Maximum Players</label>
						<div class="right">
							<input class="small-number-input" type="number" id="max-players" class="small-number-input" min="1" max="16" step="1" v-model.number="maxPlayers" />
						</div>
					</div>
				<!--
					<div class="option-section">
						<div class="option-column-title">
							Advanced set restrictions
						</div>
						<div v-if="setsInfos">
							<div class="set-list">
								<toggle id="set-all" :checked="setRestriction.length === constants.MTGSets.length" @click="setRestriction = constants.MTGSets.slice()">
									All
								</toggle>
								<toggle id="set-none" :checked="setRestriction.length === 0" @click="setRestriction = []">
									None (no restriction)
								</toggle>
							</div>
							<div class="set-list">
								<toggle v-for="code in constants.MTGSets" :key="code" :checked="setRestriction.includes(code)" @click="toggleSetRestriction(code)">
									<img :src="setsInfos[code].icon" v-tooltip="setsInfos[code].fullName" />
								</toggle>
							</div>
						</div>
					</div>
				-->
					<div class="line" v-tooltip.left="{classes: 'option-tooltip', content: '<p>If set, the system will attempt to smooth out the color distribution in each pack, as opposed to being completely random.</p>'}">
						<label for="color-balance">Color Balance</label>
						<div class="right">
							<input type="checkbox" v-model="colorBalance" id="color-balance">
						</div>
					</div>
					<div class="line" v-bind:class="{ disabled: useCustomCardList }" v-tooltip.left="{classes: 'option-tooltip', content: '<p>If enabled (default) Rares can be promoted to a Mythic at a 1/8 rate.</p><p>Disabled for Custom Card Lists.</p>'}">
						<label for="mythic-promotion">Rare promotion to Mythic</label>
						<div class="right">
							<input type="checkbox" v-model="mythicPromotion" id="mythic-promotion">
						</div>
					</div>
					<div class="option-section" v-bind:class="{ disabled: useCustomCardList }" v-tooltip.left="{classes: 'option-tooltip', content: '<p>Lets you customize the exact content of your boosters.</p><p>Notes:<ul><li>Zero is a valid value (useful for Pauper or Artisan for example).</li><li>A land slot will be automatically added for some sets.</li><li>Unused when drawing from a custom card list: See the advanced card list syntax to mimic it.</li></ul></p>'}">
						<div class="option-column-title">Booster Content</div>
						<div class="line" v-for="r in ['common', 'uncommon', 'rare']">
							<label :for="'booster-content-'+r" class="capitalized">{{r}}s</label>
							<div class="right"><input class="small-number-input" type="number" :id="'booster-content-'+r" class="small-number-input" min="0" max="16" step="1" v-model.number="boosterContent[r]"></div>
						</div>
					</div>
					<div class="option-section" v-bind:class="{ disabled: useCustomCardList }" v-tooltip.left="{classes: 'option-tooltip', content: '<p>Sets a duplicate limit for each rarity across the entire draft. Only used if no player collection is used to limit the card pool. Default values attempt to mimic a real booster box.</p>'}">
						<div class="option-column-title">Max. duplicate copies</div>
						<div class="line" v-for="r in ['common', 'uncommon', 'rare', 'mythic']">
							<label :for="'max-duplicates-'+r" class="capitalized">{{r}}s</label>
							<div class="right">
								<input class="small-number-input" type="number" :id="'max-duplicates-'+r" class="small-number-input" min="1" max="16" step="1" v-model.number="maxDuplicates[r]">
							</div>
						</div>
					</div>
					<div class="line" v-bind:class="{ disabled: useCustomCardList }" v-tooltip.left="{classes: 'option-tooltip', content: '<p>If enabled, each pack will have a chance to contain a \'foil\' card of any rarity in place of one common.</p>'}">
						<label for="option-foil">Foil</label>
						<div class="right">
							<input type="checkbox" v-model="foil" id="option-foil">
						</div>
					</div>
					<div class="line" v-tooltip.left="{classes: 'option-tooltip', content: '<p>Use a custom card list (aka Cube).</p>'}">
						<label for="use-custom-card-list">Use a Custom Card List</label>
						<div class="right">
							<input type="checkbox" v-model="useCustomCardList" id="use-custom-card-list" />
						</div>
					</div>
					<div v-bind:class="{ disabled: !useCustomCardList }" class="line">
						<label for="card-list-input">Custom Card List</label>
						<div class="right">
							<input type="file" id="card-list-input" @change="parseCustomCardList" style="display:none" accept=".txt" /><button onclick="document.querySelector('#card-list-input').click()" v-tooltip="'Import your custom card list.'">Upload <i  v-if="customCardList.length > 0" class="fas fa-check green" v-tooltip="'Card list uploaded.'"></i></button> <span v-if="customCardList.length > 0">{{customCardList.length}} cards in list.</span>
						</div>
					</div>
					<div class="option-info">Use services like <a href="https://www.cubetutor.com/" target="_blank">Cube Tutor</a> or <a href="https://cubecobra.com/" target="_blank">Cube Cobra</a> to craft your list, export it to .txt then upload it here. <a href="cubeformat.html" target="_blank">Click Here for more information.</a></div>
				</div>
				<div class="option-column">
					<h4>Draft Specific Options</h4>
					<div class="line" v-tooltip.right="{classes: 'option-tooltip', content: '<p>Draft: Boosters per Player; default is 3.</p>'}">
						<label for="boosters-per-player">Boosters per Player</label>
						<div class="right">
							<input type="number" id="boosters-per-player" class="small-number-input" min="1" max="25" step="1" v-model.number="boostersPerPlayer" />
						</div>
					</div>
					<div class="option-section" v-tooltip.right="{classes: 'option-tooltip', content: '<p>Specify the set of each booster individually. Useful for classic Chaos Draft for example.</p><p>Note: Collections are ignored for each booster with any other value than (Default).</p>'}" v-bind:class="{ disabled: useCustomCardList }">
						<div class="option-column-title">
							Individual Booster Set
						</div>
						<div v-for="(value, index) in customBoosters" class="line">
							<label for="customized-booster">Booster #{{index+1}}</label>
							<select class="right" v-model="customBoosters[index]">
								<option value="">(Default)</option>
								<option v-for="code in sets" :value="code">{{setsInfos[code].fullName}}</option>
							</select>
						</div>
					</div>
					<div class="line" v-tooltip.right="{classes: 'option-tooltip', content: '<p>In addition to picking a card each round, you will also remove this number of cards from the draft.</p><p>This is typically used in conjunction with a higher count of boosters per player for drafting with 2 to 4 players. Burn or Glimpse Draft is generally 9 boosters per players and 2 burned cards per round.</p><p>Default is 0.</p>'}">
						<label for="burned-cards-per-round">Burned cards per round</label>
						<div class="right">
							<input type="number" id="burned-cards-per-round" class="small-number-input" min="0" max="24" step="1" v-model.number="burnedCardsPerRound" />
						</div>
					</div>
					<div class="line" v-tooltip.right="{classes: 'option-tooltip', content: '<p>Controls who is going to receive the draft logs.</p><p>\'Owner only, delayed\': Owner will choose when to reveal the draft log. Useful for tournaments.</p>'}">
						<label for="draft-log-recipients">Send draft logs to</label>
						<div class="right">
							<select v-model="draftLogRecipients" id="draft-log-recipients" />
								<option value="everyone">Everyone</option>
								<option value="owner">Owner only</option>
								<option value="delayed">Owner only, delayed</option>
								<option value="none">No-one</option>
							</select>
						</div>
					</div>
				</div>
			</div>
		</modal>
		<modal v-if="displayBracket" @close="displayBracket = false">
			<h2 slot="header">Bracket <button v-if="userID === sessionOwner" @click="generateBracket">Re-Generate Bracket</button></h2>
			<div slot="body">
				<div class="bracket" v-if="bracket">
					<div class="bracket-column" v-for="col in matches">
						<div v-for="m in col" class="bracket-match">
							<div v-for="(p, index) in m.players">
								<div class="bracket-player bracket-empty" v-if="p.empty">(Empty)</div>
								<div class="bracket-player bracket-tbd" v-else-if="p.tbd">(TBD)</div>
								<div class="bracket-player" :class="{'bracket-winner': bracket.results[m.index][index] > bracket.results[m.index][(index + 1)%2]}" v-else>
									<div class="bracket-player-name">{{p}}</div> 
									<template v-if="m.isValid()">
										<input v-if="userID === sessionOwner" class="small-number-input" type="number" v-model.number="bracket.results[m.index][index]" min="0" @change="updateBracket"></input>
										<div class="bracket-result" v-else>{{bracket.results[m.index][index]}}</div>
									</template></div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</modal>
		<modal v-if="displayAbout" @close="displayAbout = false">
			<h2 slot="header">About</h2>
			<div slot="body">
				<h3>Contact</h3>
				<p>Senryoku: <a href="mailto:mtgadraft@gmail.com">mtgadraft@gmail.com</a> (French or English)</p>
				<p>MTGADraft Discord: <a href="https://discord.gg/KYKzx9m">https://discord.gg/KYKzx9m</a></p>
				<h3>Support me</h3>
				<form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_top">
					<input type="hidden" name="cmd" value="_s-xclick" />
					<input type="hidden" name="hosted_button_id" value="6L2CUS6DH82DL" />
					<input type="image" src="https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif" border="0" name="submit" title="PayPal - The safer, easier way to pay online!" alt="Donate with PayPal button" />
				</form>
				This service currently only costs me time, but if you want to encourage me to maintain and improve it you can donate via PayPal - Thank you very much if you do! - , or just send me some feedback! :)
				<h3>Patch Notes</h3>
				<patch-notes></patch-notes>
			</div>
		</modal>
		<footer>
			<span @click="displayAbout = true"><a>About</a></span>
			<span><input type="file" id="log-input" @change="openLog" style="display:none" accept=".txt" /><a onclick="document.querySelector('#log-input').click()" v-tooltip="'Open a saved draft log.'">Open Draft Log</a></span>
			<span>Made by <a href="http://senryoku.github.io/">Senryoku</a></span>
			<span><a href="mailto:mtgadraft@gmail.com">Contact</a></span>
			<span>Get <a href="https://magic.wizards.com/fr/mtgarena">Magic: The Gathering Arena</a>
		</footer>
		<div class="disconnected-icon" v-if="socket && socket.disconnected" v-tooltip="'You are disconnected from the server, some functionnalities won\'t be available until the connection is re-established.'">
			<i class="fas fa-exclamation-triangle"></i> Disconnected
		</div>
	</div>
	
	<script src="socket.io/socket.io.js"></script>
	<script type="text/javascript" src="js/helper.js"></script>
	<script type="text/javascript" src="js/constants.js"></script>
	<script type="text/javascript" src="js/cookies.js"></script>
	<script type="text/javascript" src="js/draft.js"></script>
</body>
</html>

<script>
"use strict";
import HelloWorld from "./components/HelloWorld.vue";

const ColorOrder = { W: 0, U: 1, B: 2, R: 3, G: 4 };
function orderColor(lhs, rhs) {
	if (!lhs || !rhs) return 0;
	if (lhs.length == 1 && rhs.length == 1) return ColorOrder[lhs[0]] - ColorOrder[rhs[0]];
	else if (lhs.length == 1) return -1;
	else if (rhs.length == 1) return 1;
	else return String(lhs.flat()).localeCompare(String(rhs.flat()));
}

const SwalCustomClasses = {
	popup: "custom-swal-popup",
	title: "custom-swal-title",
	content: "custom-swal-content",
};

const DraftState = {
	Waiting: "Waiting",
	Picking: "Picking",
	Brewing: "Brewing",
	Watching: "Watching",
	WinstonPicking: "WinstonPicking",
	WinstonWaiting: "WinstonWaiting",
};

const ReadyState = {
	Unknown: "Unknown",
	Ready: "Ready",
	NotReady: "NotReady",
	DontCare: "DontCare",
};

const Sounds = {
	start: new Audio("sound/drop_003.ogg"),
	next: new Audio("sound/next.mp3"),
	countdown: new Audio("sound/click_001.ogg"),
	readyCheck: new Audio("sound/drop_003.ogg"),
};

let UniqueID = 0;

Vue.use(window.VueClazyLoad);
VTooltip.VTooltip.options.defaultPlacement = "bottom-start";
VTooltip.VTooltip.options.defaultBoundariesElement = "window";

export default {
	name: "App",
	el: "#main-vue",
	components: {
		Multiselect: window.VueMultiselect.default,
		draggable: window.vuedraggable,
		VueClazyLoad: window.VueClazyLoad,
	},
	data: {
		// Card Data
		cards: undefined,

		// User Data
		userID: guid(),
		userName: getCookie("userName", "Anonymous"),
		useCollection: getCookie("useCollection", true),
		collection: {},
		socket: undefined,

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
		virtualPlayersData: undefined,
		booster: [],
		boosterNumber: 0,
		pickNumber: 0,
		winstonDraftState: null,

		publicSessions: [],
		selectedPublicSession: "",

		// Front-end options & data
		userOrder: [],
		hideSessionID: getCookie("hideSessionID", false),
		languages: window.constants.Languages,
		language: getCookie("language", "en"),
		sets: window.constants.MTGSets,
		pendingReadyCheck: false,
		cardOrder: getCookie("cardOrder", "DraggableCMC"),
		setsInfos: undefined,
		draftingState: undefined,
		pickOnDblclick: getCookie("pickOnDblclick", false),
		enableSound: getCookie("enableSound", true),
		enableNotifications:
			typeof Notification !== "undefined" &&
			Notification &&
			Notification.permission == "granted" &&
			getCookie("enableNotifications", false),
		notificationPermission: typeof Notification !== "undefined" && Notification && Notification.permission,
		selectedCard: undefined,
		burningCards: [],
		deck: [],
		sideboard: [],
		autoLand: true,
		lands: { W: 0, U: 0, B: 0, R: 0, G: 0 },
		deckColumn: [[], [], [], [], [], [], []],
		sideboardColumn: [[], [], [], [], [], [], []],

		showSessionOptionsDialog: false,
		displayBracket: false,
		displayAbout: false,
		// Draft Log Modal
		displayDraftLog: false,
		draftLogDisplayOptions: {
			detailsUserID: undefined,
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
	},
	methods: {
		initialize: function () {
			let storedUserID = getCookie("userID", null);
			if (storedUserID != null) {
				this.userID = storedUserID;
				// Server will handle the reconnect attempt if draft is still ongoing
				console.log("storedUserID: " + storedUserID);
			}

			// Socket Setup
			this.socket = io({
				query: {
					userID: this.userID,
					sessionID: this.sessionID,
					userName: this.userName,
				},
			});

			this.socket.on("disconnect", function () {
				console.log("Disconnected from server.");
				Swal.fire({
					customClass: SwalCustomClasses,
					type: "error",
					title: "Disconnected!",
					showConfirmButton: false,
				});
			});

			this.socket.on("reconnect", function (attemptNumber) {
				console.log(`Reconnected to server (attempt ${attemptNumber}).`);

				Swal.fire({
					customClass: SwalCustomClasses,
					type: "warning",
					title: "Reconnected!",
					timer: 1500,
				});
			});

			this.socket.on("alreadyConnected", function (newID) {
				app.userID = newID;
				this.query.userID = newID;
			});

			this.socket.on("chatMessage", function (message) {
				app.messagesHistory.push(message);
				// TODO: Cleanup this?
				let bubble = document.querySelector("#chat-bubble-" + message.author);
				bubble.innerText = message.text;
				bubble.style.opacity = 1;
				if (bubble.timeoutHandler) clearTimeout(bubble.timeoutHandler);
				bubble.timeoutHandler = window.setTimeout(() => (bubble.style.opacity = 0), 5000);
			});

			this.socket.on("publicSessions", function (sessions) {
				app.publicSessions = sessions;
			});

			this.socket.on("setSession", function (sessionID) {
				app.sessionID = sessionID;
				this.query.sessionID = sessionID;
				if (app.drafting) {
					// Expelled during drafting
					app.drafting = false;
					app.draftingState = DraftState.Brewing;
				}
			});

			this.socket.on("sessionUsers", function (users) {
				for (let u of users) {
					u.pickedThisRound = false;
					u.readyState = ReadyState.DontCare;
				}

				app.sessionUsers = users;
				app.userOrder = users.map((u) => u.userID);
			});

			this.socket.on("userDisconnected", function (userNames) {
				if (!app.drafting) return;

				if (app.winstonDraftState) {
					Swal.fire({
						position: "center",
						customClass: SwalCustomClasses,
						type: "error",
						title: `Player(s) disconnected`,
						text: `Wait for ${userNames.join(", ")} to come back or...`,
						showConfirmButton: true,
						allowOutsideClick: false,
						confirmButtonText: "Stop draft",
					}).then((result) => {
						if (result.value) app.socket.emit("stopDraft");
					});
				} else {
					if (app.userID == app.sessionOwner) {
						Swal.fire({
							position: "center",
							customClass: SwalCustomClasses,
							type: "error",
							title: `Player(s) disconnected`,
							text: `Wait for ${userNames.join(", ")} to come back or...`,
							showConfirmButton: true,
							allowOutsideClick: false,
							confirmButtonText: "Replace with a bot",
						}).then((result) => {
							if (result.value) app.socket.emit("replaceDisconnectedPlayers");
						});
					} else {
						Swal.fire({
							position: "center",
							customClass: SwalCustomClasses,
							type: "error",
							title: `Player(s) disconnected`,
							text: `Wait for ${userNames.join(
								", "
							)} to come back or for the owner to replace them by a bot.`,
							showConfirmButton: false,
							allowOutsideClick: false,
						});
					}
				}
			});

			this.socket.on("updateUser", function (data) {
				let user = app.userByID[data.userID];
				if (!user) {
					if (data.userID === app.sessionOwner && data.updatedProperties.userName)
						app.sessionOwnerUsername = data.updatedProperties.userName;
					return;
				}

				for (let prop in data.updatedProperties) {
					user[prop] = data.updatedProperties[prop];
				}
			});

			this.socket.on("sessionOptions", function (sessionOptions) {
				for (let prop in sessionOptions) {
					app[prop] = sessionOptions[prop];
				}
			});
			this.socket.on("sessionOwner", function (ownerID, ownerUserName) {
				app.sessionOwner = ownerID;
				if (ownerUserName) app.sessionOwnerUsername = ownerUserName;
			});
			this.socket.on("isPublic", function (data) {
				app.isPublic = data;
			});
			this.socket.on("ignoreCollections", function (ignoreCollections) {
				app.ignoreCollections = ignoreCollections;
			});
			this.socket.on("boostersPerPlayer", function (data) {
				app.boostersPerPlayer = parseInt(data);
			});
			this.socket.on("bots", function (data) {
				app.bots = parseInt(data);
			});
			this.socket.on("setMaxPlayers", function (maxPlayers) {
				app.maxPlayers = parseInt(maxPlayers);
			});
			this.socket.on("setRestriction", function (setRestriction) {
				app.setRestriction = setRestriction;
			});
			this.socket.on("setPickTimer", function (timer) {
				app.maxTimer = timer;
			});

			this.socket.on("message", function (data) {
				if (data.title === undefined) data.title = "[Missing Title]";
				if (data.text === undefined) data.text = "";

				if (data.showConfirmButton === undefined) data.showConfirmButton = true;
				else if (!data.showConfirmButton && data.timer === undefined) data.timer = 1500;

				if (data.allowOutsideClick === undefined) data.allowOutsideClick = true;

				Swal.fire({
					position: "center",
					type: "info",
					title: data.title,
					text: data.text,
					customClass: SwalCustomClasses,
					showConfirmButton: data.showConfirmButton,
					timer: data.timer,
					allowOutsideClick: data.allowOutsideClick,
				});
			});

			this.socket.on("readyCheck", function () {
				if (app.drafting) return;

				app.initReadyCheck();

				if (app.enableNotifications) {
					let notification = new Notification("Are you ready?", {
						body: `${app.userByID[app.sessionOwner].userName} has initiated a ready check`,
					});
				}

				const ownerUsername =
					app.sessionOwner in app.userByID
						? app.userByID[app.sessionOwner].userName
						: app.sessionOwnerUsername
						? app.sessionOwnerUsername
						: "Session owner";

				Swal.fire({
					position: "center",
					type: "question",
					title: "Are you ready?",
					text: `${ownerUsername} has initiated a ready check`,
					customClass: SwalCustomClasses,
					showCancelButton: true,
					confirmButtonColor: "#3085d6",
					cancelButtonColor: "#d33",
					confirmButtonText: "I'm ready!",
					cancelButtonText: "Not Ready",
				}).then((result) => {
					app.socket.emit("setReady", result.value ? ReadyState.Ready : ReadyState.NotReady);
				});
			});

			this.socket.on("setReady", function (userID, readyState) {
				if (!app.pendingReadyCheck) return;
				if (userID in app.userByID) app.userByID[userID].readyState = readyState;
				if (app.sessionUsers.every((u) => u.readyState === ReadyState.Ready))
					app.fireToast("success", "Everybody is ready!");
			});

			this.socket.on("startWinstonDraft", function (state) {
				setCookie("userID", app.userID);
				app.drafting = true;
				app.setWinstonDraftState(state);
				app.stopReadyCheck();
				app.sideboard = [];
				app.deck = [];
				app.playSound("start");
				Swal.fire({
					position: "center",
					type: "success",
					title: "Starting Winston Draft!",
					customClass: SwalCustomClasses,
					showConfirmButton: false,
					timer: 1500,
				});

				if (app.enableNotifications) {
					let notification = new Notification("Now drafting!", {
						body: `Your Winston draft '${app.sessionID}' is starting!`,
					});
				}
			});
			this.socket.on("winstonDraftSync", function (winstonDraftState) {
				app.setWinstonDraftState(winstonDraftState);
			});
			this.socket.on("winstonDraftNextRound", function (currentUser) {
				if (app.userID === currentUser) {
					app.playSound("next");
					app.fireToast("success", "Your turn!");
					if (app.enableNotifications) {
						let notification = new Notification("Your turn!", {
							body: `This is your turn to pick.`,
						});
					}
					app.draftingState = DraftState.WinstonPicking;
				} else {
					app.draftingState = DraftState.WinstonWaiting;
				}
			});
			this.socket.on("winstonDraftEnd", function () {
				app.drafting = false;
				app.winstonDraftState = null;
				app.draftingState = DraftState.Brewing;
				app.fireToast("success", "Done drafting!");
			});
			this.socket.on("winstonDraftRandomCard", function (card) {
				const c = app.genCard(card);
				app.addToDeck(c);
				Swal.fire({
					position: "center",
					title: `You drew ${c.printed_name[app.language]} from the card pool!`,
					imageUrl: c.image_uris[app.language],
					imageAlt: c.printed_name[app.language],
					imageWidth: 250,
					customClass: SwalCustomClasses,
					showConfirmButton: true,
				});
			});

			this.socket.on("rejoinWinstonDraft", function (data) {
				app.drafting = true;

				app.setWinstonDraftState(data.state);
				app.sideboard = [];
				app.deck = [];
				for (let c of data.pickedCards) app.addToDeck(app.cards[c]);

				if (app.userID === data.state.currentUser) app.draftingState = DraftState.WinstonPicking;
				else app.draftingState = DraftState.WinstonWaiting;

				Swal.fire({
					position: "center",
					type: "success",
					title: "Reconnected to the Winston draft!",
					customClass: SwalCustomClasses,
					showConfirmButton: false,
					timer: 1500,
				});
			});

			this.socket.on("startDraft", function () {
				// Save user ID in case of disconnect
				setCookie("userID", app.userID);

				app.drafting = true;
				app.stopReadyCheck();
				app.sideboard = [];
				app.deck = [];
				Swal.fire({
					position: "center",
					type: "success",
					title: "Now drafting!",
					customClass: SwalCustomClasses,
					showConfirmButton: false,
					timer: 1500,
				});

				app.playSound("start");

				if (app.enableNotifications) {
					let notification = new Notification("Now drafting!", {
						body: `Your draft '${app.sessionID}' is starting!`,
					});
				}

				// Are we just an Organizer, and not a player?
				if (!app.virtualPlayers.map((u) => u.userID).includes(app.userID)) {
					app.draftingState = DraftState.Watching;
				}
			});

			this.socket.on("rejoinDraft", function (data) {
				app.drafting = true;

				app.sideboard = [];
				app.deck = [];
				for (let c of data.pickedCards) app.addToDeck(app.genCard(c));

				app.booster = [];
				for (let c of data.booster) {
					app.booster.push(app.genCard(c));
				}
				app.boosterNumber = data.boosterNumber;
				app.pickNumber = data.pickNumber;

				app.pickedThisRound = data.pickedThisRound;
				if (app.pickedThisRound) app.draftingState = DraftState.Waiting;
				else app.draftingState = DraftState.Picking;
				app.selectedCard = undefined;
				app.burningCards = [];

				Swal.fire({
					position: "center",
					type: "success",
					title: "Reconnected to the draft!",
					customClass: SwalCustomClasses,
					showConfirmButton: false,
					timer: 1500,
				});
			});

			this.socket.on("nextBooster", function (data) {
				app.booster = [];
				for (let u of app.sessionUsers) {
					u.pickedThisRound = false;
				}
				app.boosterNumber = data.boosterNumber;
				app.pickNumber = data.pickNumber;

				// Only watching, not playing/receiving a boost ourself.
				if (app.draftingState == DraftState.Watching) return;

				for (let c of data.booster) {
					app.booster.push(app.genCard(c));
				}
				app.playSound("next");
				app.draftingState = DraftState.Picking;
			});

			this.socket.on("endDraft", function (data) {
				Swal.fire({
					position: "center",
					type: "success",
					title: "Done drafting!",
					showConfirmButton: false,
					customClass: SwalCustomClasses,
					timer: 1500,
				});
				app.drafting = false;
				if (app.draftingState === DraftState.Watching) {
					app.draftingState = undefined;
				} else {
					// User was playing
					app.draftingState = DraftState.Brewing;
				}
			});

			this.socket.on("draftLog", function (draftLog) {
				if (draftLog.delayed && draftLog.delayed === true) {
					localStorage.setItem("draftLog", JSON.stringify(draftLog));
					app.draftLog = undefined;
					app.savedDraftLog = true;
				} else {
					localStorage.setItem("draftLog", JSON.stringify(draftLog));
					app.draftLog = draftLog;
				}
			});

			this.socket.on("pickAlert", function (data) {
				app.fireToast("info", `${data.userName} picked ${app.cards[data.cardID].printed_name[app.language]}!`);
			});

			this.socket.on("setCardSelection", function (data) {
				app.sideboard = [];
				app.deck = [];
				for (let c of data.flat()) {
					app.deck.push(app.genCard(c));
				}
				app.draftingState = DraftState.Brewing;
				// Hide waiting popup for sealed
				if (Swal.isVisible()) Swal.close();
			});

			this.socket.on("timer", function (data) {
				if (data.countdown == 0) app.forcePick(app.booster);
				if (data.countdown < 10) {
					let chrono = document.getElementById("chrono");
					if (chrono) {
						chrono.classList.add("pulsing");
						setTimeout(() => {
							let chrono = document.getElementById("chrono");
							if (chrono) chrono.classList.remove("pulsing");
						}, 500);
					}
				}
				if (data.countdown > 0 && data.countdown <= 5) app.playSound("countdown");
				app.pickTimer = data.countdown;
			});

			this.socket.on("disableTimer", function () {
				app.pickTimer = -1;
			});

			// Look for a locally stored collection
			let localStorageCollection = localStorage.getItem("Collection");
			if (localStorageCollection) {
				try {
					let json = JSON.parse(localStorageCollection);
					this.setCollection(json);
					console.log("Loaded collection from local storage");
				} catch (e) {
					console.error(e);
				}
			}

			// Look for a previous draftLog
			let tmpDraftLog = JSON.parse(localStorage.getItem("draftLog"));
			if (tmpDraftLog) {
				if (tmpDraftLog.delayed) this.savedDraftLog = true;
				else this.draftLog = tmpDraftLog;
			}

			let urlParamSession = getUrlVars()["session"];
			if (urlParamSession) this.sessionID = decodeURI(urlParamSession);

			for (let key in Sounds) Sounds[key].volume = 0.4;
			Sounds["countdown"].volume = 0.11;
		},
		playSound: function (key) {
			if (this.enableSound) Sounds[key].play();
		},
		// Chat Methods
		sendChatMessage: function (e) {
			if (!this.currentChatMessage || this.currentChatMessage == "") return;
			this.socket.emit("chatMessage", {
				author: this.userID,
				timestamp: Date.now(),
				text: this.currentChatMessage,
			});
			this.currentChatMessage = "";
		},
		// Draft Methods
		selectCard: function (e, c) {
			this.selectedCard = c;
			this.restoreCard(null, c);
		},
		burnCard: function (e, c) {
			if (this.burningCards.includes(c)) return;
			this.burningCards.push(c);
			if (this.burningCards.length > this.burnedCardsPerRound) this.burningCards.shift();
			if (e) e.stopPropagation();
		},
		restoreCard: function (e, c) {
			if (!this.burningCards.includes(c)) return;
			this.burningCards.splice(
				this.burningCards.findIndex((o) => o === c),
				1
			);
			if (e) e.stopPropagation();
		},
		doubleClickCard: function (e, c) {
			this.selectCard(e, c);
			if (this.pickOnDblclick) this.pickCard();
		},
		addToDeck: function (card) {
			// Handle column sync.
			this.deck.push(card);
			this.deckColumn[Math.min(card.cmc, this.deckColumn.length - 1)].push(card);
		},
		addToSideboard: function (card) {
			// Handle column sync.
			this.sideboard.push(card);
			this.sideboardColumn[Math.min(card.cmc, this.sideboardColumn.length - 1)].push(card);
		},
		pickCard: function () {
			if (
				this.draftingState != DraftState.Picking ||
				!this.selectedCard ||
				this.burningCards.length > this.burnedCardsPerRound ||
				(this.burningCards.length !== this.burnedCardsPerRound &&
					this.booster.length !== this.burningCards.length + 1) // Allows for burning less cards only if we're finishing the booster
			)
				return;

			if (this.socket.disconnected) {
				this.disconnectedReminder();
				return;
			}

			this.socket.emit(
				"pickCard",
				{ selectedCard: this.selectedCard.id, burnedCards: this.burningCards.map((c) => c.id) },
				(answer) => {
					if (answer.code !== 0) alert(`pickCard: Unexpected answer: ${answer.error}`);
				}
			);
			this.draftingState = DraftState.Waiting;
			this.addToDeck(this.selectedCard);
			this.selectedCard = undefined;
			this.burningCards = [];
		},
		forcePick: function () {
			if (this.draftingState != DraftState.Picking) return;
			// Forces a random card if none is selected
			if (!this.selectedCard) {
				const randomIdx = Math.floor(Math.random() * this.booster.length);
				this.selectedCard = this.booster[randomIdx];
			}
			// Forces random cards to burn if there isn't enough selected already
			while (
				1 + this.burningCards.length < this.booster.length &&
				this.burningCards.length < this.burnedCardsPerRound
			) {
				let randomIdx;
				do randomIdx = Math.floor(Math.random() * this.booster.length);
				while (
					this.booster[randomIdx] === this.selectedCard ||
					this.burningCards.includes(this.booster[randomIdx])
				);
				this.burningCards.push(this.booster[randomIdx]);
			}
			this.socket.emit(
				"pickCard",
				{ selectedCard: this.selectedCard.id, burnedCards: this.burningCards.map((c) => c.id) },
				(anwser) => {
					if (anwser.code !== 0) alert(`pickCard: Unexpected answer:`, anwser);
				}
			);
			this.draftingState = DraftState.Waiting;
			this.addToDeck(this.selectedCard);
			this.selectedCard = undefined;
			this.burningCards = [];
		},
		setWinstonDraftState: function (state) {
			this.winstonDraftState = state;
			const piles = [];
			for (let p of state.piles) {
				let pile = [];
				for (let c of p) pile.push(this.genCard(c));
				piles.push(pile);
			}
			this.winstonDraftState.piles = piles;
		},
		startWinstonDraft: async function () {
			if (this.userID != this.sessionOwner || this.drafting) return;

			if (!this.ownerIsPlayer) {
				Swal.fire({
					type: "error",
					title: "Owner has to play",
					text:
						"Non-playing owner is not supported in Winston Draft for now. The 'Session owner is playing' option needs to be active.",
					customClass: SwalCustomClasses,
				});
				return;
			}

			const { value: boosterCount } = await Swal.fire({
				title: "Winston Draft",
				html: `Winston Draft is a draft variant for two players, <a href="https://mtg.gamepedia.com/Winston_Draft" target="_blank">more information here</a>. How many boosters for the main stack (default is 6)?`,
				inputPlaceholder: "Booster count",
				input: "number",
				inputAttributes: {
					min: 6,
					max: 12,
					step: 1,
				},
				inputValue: 6,
				customClass: SwalCustomClasses,
				showCancelButton: true,
				confirmButtonColor: "#3085d6",
				cancelButtonColor: "#d33",
				confirmButtonText: "Start Winston Draft",
			});

			if (boosterCount) {
				this.socket.emit("startWinstonDraft", boosterCount);
			}
		},
		winstonDraftTakePile: function () {
			const cards = this.winstonDraftState.piles[this.winstonDraftState.currentPile];
			this.socket.emit("winstonDraftTakePile", (answer) => {
				if (answer.code === 0) {
					for (let c of cards) this.addToDeck(c);
				} else alert("Error: ", answer.error);
			});
		},
		winstonDraftSkipPile: function () {
			this.socket.emit("winstonDraftSkipPile", (answer) => {
				if (answer.code !== 0) alert("Error: ", answer.error);
			});
		},
		checkNotificationPermission: function (e) {
			if (e.target.checked && typeof Notification !== "undefined" && Notification.permission != "granted") {
				Notification.requestPermission().then(function (permission) {
					this.notificationPermission = permission;
					if (permission != "granted") {
						this.enableNotifications = false;
					}
				});
			}
		},
		deckToSideboard: function (e, c) {
			// From deck to sideboard
			let idx = this.deck.indexOf(c);
			if (idx >= 0) {
				this.deck.splice(idx, 1);
				this.addToSideboard(c);
			} else return;

			for (let col of this.deckColumn) {
				let idx = col.indexOf(c);
				if (idx >= 0) {
					col.splice(idx, 1);
					break;
				}
			}
		},
		sideboardToDeck: function (e, c) {
			// From sideboard to deck
			let idx = this.sideboard.indexOf(c);
			if (idx >= 0) {
				this.sideboard.splice(idx, 1);
				this.addToDeck(c);
			} else return;

			for (let col of this.sideboardColumn) {
				let idx = col.indexOf(c);
				if (idx >= 0) {
					col.splice(idx, 1);
					break;
				}
			}
		},
		// Collection management
		setCollection: function (json) {
			if (this.collection == json) return;
			this.collection = Object.freeze(json);
			this.socket.emit("setCollection", this.collection);
		},
		parseMTGALog: function (e) {
			let file = e.target.files[0];
			if (!file) {
				return;
			}
			var reader = new FileReader();
			reader.onload = async function (e) {
				let contents = e.target.result;

				let playerIds = new Set(Array.from(contents.matchAll(/"playerId":"([^"]+)"/g)).map((e) => e[1]));

				const parseCollection = function (contents, startIdx = null) {
					const rpcName = "PlayerInventory.GetPlayerCardsV3";
					try {
						const call_idx = startIdx
							? contents.lastIndexOf(rpcName, startIdx)
							: contents.lastIndexOf(rpcName);
						const collection_start = contents.indexOf("{", call_idx);
						const collection_end = contents.indexOf("}}", collection_start) + 2;
						const collStr = contents.slice(collection_start, collection_end);
						const collJson = JSON.parse(collStr)["payload"];
						//for (let c of Object.keys(collJson).filter((c) => !(c in app.cards))) console.log(c, " not found.");
						return collJson;
					} catch (e) {
						Swal.fire({
							type: "error",
							title: "Parsing Error",
							text:
								"An error occurred during parsing. Please make sure that you selected the correct file and that the detailed logs option (found in Options > View Account > Detailed Logs (Plugin Support)) is activated in game.",
							footer: "Full error: " + e,
							customClass: SwalCustomClasses,
						});
						return null;
					}
				};

				let collection = null;
				if (playerIds.size > 1) {
					const swalResult = await Swal.fire({
						type: "question",
						title: "Multiple Accounts",
						text: `Looks like there are collections from multiple accounts (${playerIds.size}) in these logs, do you want to intersect them all, or just import the latest?`,
						customClass: SwalCustomClasses,
						showCancelButton: true,
						showConfirmButton: true,
						confirmButtonColor: "#3085d6",
						cancelButtonColor: "#d33",
						confirmButtonText: "Intersect",
						cancelButtonText: "Latest Only",
					});
					if (swalResult.value) {
						const collections = [];
						for (let pid of playerIds) {
							const startIdx = contents.lastIndexOf(`"payload":{"playerId":"${pid}"`);
							const coll = parseCollection(contents, startIdx);
							if (coll) collections.push(coll);
						}
						let cardids = Object.keys(collections[0]);
						// Filter ids
						for (let i = 1; i < collections.length; ++i)
							cardids = Object.keys(collections[i]).filter((id) => cardids.includes(id));
						// Find min amount of each card
						collection = {};
						for (let id of cardids) collection[id] = collections[0][id];
						for (let i = 1; i < collections.length; ++i)
							for (let id of cardids) collection[id] = Math.min(collection[id], collections[i][id]);
					} else collection = parseCollection(contents);
				} else collection = parseCollection(contents);

				if (collection !== null) {
					localStorage.setItem("Collection", JSON.stringify(collection));
					localStorage.setItem("CollectionDate", new Date().toLocaleDateString());
					app.setCollection(collection);
					Swal.fire({
						position: "top-end",
						customClass: "swal-container",
						type: "success",
						title: "Collection updated",
						customClass: SwalCustomClasses,
						showConfirmButton: false,
						timer: 1500,
					});
				}
			};
			reader.readAsText(file);
		},
		fireToast: function (type, title) {
			Swal.fire({
				toast: true,
				position: "top-end",
				type: type,
				title: title,
				customClass: SwalCustomClasses,
				showConfirmButton: false,
				timer: 2000,
			});
		},
		disconnectedReminder: function () {
			this.fireToast("error", "Disconnected from server!");
		},
		parseCustomCardList: function (e) {
			let file = e.target.files[0];
			if (!file) {
				return;
			}
			Swal.fire({
				position: "center",
				customClass: SwalCustomClasses,
				type: "info",
				title: "Parsing card list...",
				showConfirmButton: false,
			});
			var reader = new FileReader();
			reader.onload = function (e) {
				let contents = e.target.result;

				const parseLine = function (line) {
					line = line.trim();
					let [fullMatch, count, name, set, number] = line.match(
						/^(?:(\d+)\s+)?([^(\v\n]+)??(?:\s\((\w+)\)(?:\s+(\d+))?)?\s*$/
					);
					if (!count) count = 1;
					if (set) {
						set = set.toLowerCase();
						if (set === "dar") set = "dom";
						if (set === "conf") set = "con";
					}
					// Note: The regex currently cannot catch this case. Without parenthesis, the collector number will be part of the name.
					if (number && !set) {
						Swal.fire({
							type: "warning",
							title: `Collector number without Set`,
							text: `You should not specify a collector number without also specifying a set: '${line}'.`,
							customClass: SwalCustomClasses,
						});
					}
					let cardID = Object.keys(app.cards).find(
						(id) =>
							app.cards[id].name == name &&
							(!set || app.cards[id].set === set) &&
							(!number || app.cards[id].collector_number === number)
					);
					if (typeof cardID !== "undefined") {
						return [count, cardID];
					} else {
						// If not found, try doubled faced cards before giving up!
						cardID = Object.keys(app.cards).find(
							(id) =>
								app.cards[id].name.startsWith(name + " //") &&
								(!set || app.cards[id].set === set) &&
								(!number || app.cards[id].collector_number === number)
						);
						if (typeof cardID !== "undefined") return [count, cardID];
					}

					Swal.fire({
						type: "error",
						title: `Card not found`,
						text: `Could not find '${name}' in our database.`,
						footer: `Full line: '${line}'`,
						customClass: SwalCustomClasses,
					});
					return [0, undefined];
				};

				try {
					const lines = contents.split(/\r\n|\n/);
					// Custom rarity sheets
					if (lines[0].trim()[0] === "[") {
						let line = 0;
						let cardCount = 0;
						let cardList = {
							customSheets: true,
							cardsPerBooster: {},
							cards: {},
						};
						let headerRegex = new RegExp(String.raw`\[([^\(\]]+)(\((\d+)\))?\]`); // Groups: SlotName, '(Count)', Count
						while (line < lines.length) {
							let header = lines[line].match(headerRegex);
							if (!header) {
								Swal.fire({
									type: "error",
									title: `Slot`,
									text: `Error parsing slot '${lines[line]}'.`,
									customClass: SwalCustomClasses,
								});
								return;
							}
							cardList.cardsPerBooster[header[1]] = parseInt(header[3]);
							cardList.cards[header[1]] = [];
							line += 1;
							while (line < lines.length && lines[line].trim()[0] !== "[") {
								if (lines[line]) {
									let [count, cardID] = parseLine(lines[line].trim());
									if (typeof cardID !== "undefined") {
										for (let i = 0; i < count; ++i) cardList.cards[header[1]].push(cardID);
										cardCount += count;
									} else return;
								}
								line += 1;
							}
						}
						cardList.length = cardCount;
						app.customCardList = cardList;
					} else {
						let cardList = [];
						for (let line of lines) {
							if (line) {
								let [count, cardID] = parseLine(line);
								if (typeof cardID !== "undefined") {
									for (let i = 0; i < count; ++i) cardList.push(cardID);
								} else return;
							}
						}
						app.customCardList = cardList;
					}
					app.socket.emit("customCardList", app.customCardList, (answer) => {
						if (answer.code === 0) {
							app.fireToast("success", `Card list uploaded (${app.customCardList.length} cards)`);
						} else {
							app.fireToast("error", `Error while uploading card list: ${answer.error}`);
						}
					});
				} catch (e) {
					Swal.fire({
						type: "error",
						title: "Parsing Error",
						text: "An error occurred during parsing, please check you input file.",
						footer: "Full error: " + e,
						customClass: SwalCustomClasses,
					});
				}
			};
			reader.readAsText(file);
		},
		exportDeck: function () {
			copyToClipboard(exportMTGA(this.deck, this.sideboard, this.language, this.lands));
			this.fireToast("success", "Deck exported to clipboard!");
		},
		downloadLog: function () {
			let draftLogFull = this.draftLog;
			for (let e in this.draftLog.users) {
				let cards = [];
				for (let c of this.draftLog.users[e].cards) cards.push(this.cards[c]);
				this.draftLog.users[e].exportString = exportMTGA(cards, null, this.language);
			}
			download(`DraftLog_${this.draftLog.sessionID}.txt`, JSON.stringify(draftLogFull, null, "\t"));
		},
		openLog: function (e) {
			let file = e.target.files[0];
			if (!file) {
				return;
			}
			var reader = new FileReader();
			reader.onload = function (e) {
				try {
					let contents = e.target.result;
					let json = JSON.parse(contents);
					if (json.users) {
						app.draftLog = json;
						app.displayDraftLog = true;
					} else {
						Swal.fire({
							type: "error",
							title: "Parsing Error",
							text:
								"An error occurred during parsing. Please make sure that you selected the correct file.",
							footer: "Full error: Missing required data",
							customClass: SwalCustomClasses,
						});
					}
				} catch (e) {
					Swal.fire({
						type: "error",
						title: "Parsing Error",
						text: "An error occurred during parsing. Please make sure that you selected the correct file.",
						footer: "Full error: " + e,
						customClass: SwalCustomClasses,
					});
				}
			};
			reader.readAsText(file);
		},
		exportSingleLog: function (id) {
			let cards = [];
			for (let c of this.draftLog.users[id].cards) cards.push(this.cards[c]);
			copyToClipboard(exportMTGA(cards, null, this.language), null, "\t");
			this.fireToast("success", "Card list exported to clipboard!");
		},
		downloadMPT: function (id) {
			download(`DraftLog_${id}.txt`, exportToMagicProTools(this.cards, this.draftLog, id));
		},
		submitToMPT: function (id) {
			fetch("https://magicprotools.com/api/draft/add", {
				credentials: "omit",
				headers: {
					Accept: "application/json, text/plain, */*",
					"Content-Type": "application/x-www-form-urlencoded",
				},
				referrer: "https://mtgadraft.herokuapp.com",
				body: `draft=${encodeURI(
					exportToMagicProTools(this.cards, this.draftLog, id)
				)}&apiKey=yitaOuTvlngqlKutnKKfNA&platform=mtgadraft`,
				method: "POST",
				mode: "cors",
			}).then(function (response) {
				if (response.status !== 200) {
					app.fireToast("error", "An error occured submiting log to MagicProTools.");
				} else {
					response.json().then(function (json) {
						if (json.error) {
							app.fireToast("error", `Error: ${json.error}.`);
						} else {
							if (json.url) {
								copyToClipboard(json.url);
								app.fireToast("success", "MagicProTools URL copied to clipboard.");
								window.open(json.url, "_blank");
							} else {
								app.fireToast("error", "An error occured submiting log to MagicProTools.");
							}
						}
					});
				}
			});
		},
		sessionURLToClipboard: function () {
			copyToClipboard(
				`${window.location.protocol}//${window.location.hostname}:${window.location.port}/?session=${encodeURI(
					this.sessionID
				)}`
			);
			this.fireToast("success", "Session link copied to clipboard!");
		},
		toggleSetRestriction: function (code) {
			if (this.setRestriction.includes(code))
				this.setRestriction.splice(
					this.setRestriction.findIndex((c) => c === code),
					1
				);
			else this.setRestriction.push(code);
		},
		setSessionOwner: function (newOwnerID) {
			if (this.userID != this.sessionOwner) return;
			let user = this.sessionUsers.find((u) => u.userID === newOwnerID);
			if (!user) return;
			Swal.fire({
				title: "Are you sure?",
				text: `Do you want to surrender session ownership to ${user.userName}?`,
				type: "warning",
				showCancelButton: true,
				customClass: SwalCustomClasses,
				confirmButtonColor: "#3085d6",
				cancelButtonColor: "#d33",
				confirmButtonText: "Yes",
			}).then((result) => {
				if (result.value) {
					this.socket.emit("setSessionOwner", newOwnerID);
				}
			});
		},
		removePlayer: function (userID) {
			if (this.userID != this.sessionOwner) return;
			let user = this.sessionUsers.find((u) => u.userID === userID);
			if (!user) return;
			Swal.fire({
				title: "Are you sure?",
				text: `Do you want to remove player '${user.userName}' from the session? They'll still be able to rejoin if they want.`,
				type: "warning",
				showCancelButton: true,
				customClass: SwalCustomClasses,
				confirmButtonColor: "#3085d6",
				cancelButtonColor: "#d33",
				confirmButtonText: "Yes",
			}).then((result) => {
				if (result.value) {
					this.socket.emit("removePlayer", userID);
				}
			});
		},
		movePlayer: function (idx, dir) {
			if (this.userID != this.sessionOwner) return;

			const negMod = (m, n) => ((m % n) + n) % n;
			let other = negMod(idx + dir, this.userOrder.length);
			[this.userOrder[idx], this.userOrder[other]] = [this.userOrder[other], this.userOrder[idx]];

			this.socket.emit("setSeating", this.userOrder);
		},
		changePlayerOrder: function () {
			if (this.userID != this.sessionOwner) return;
			this.socket.emit("setSeating", this.userOrder);
		},
		randomizeSeating: function (userID, dir) {
			if (this.userID != this.sessionOwner) return;
			this.socket.emit("randomizeSeating");
		},
		distributeSealed: function (boosterCount) {
			if (this.deck.length > 0) {
				Swal.fire({
					title: "Are you sure?",
					text: "Distributing sealed boosters will reset everyone's cards/deck!",
					type: "warning",
					showCancelButton: true,
					customClass: SwalCustomClasses,
					confirmButtonColor: "#3085d6",
					cancelButtonColor: "#d33",
					confirmButtonText: "Yes, distribute!",
				}).then((result) => {
					if (result.value) {
						this.doDistributeSealed(boosterCount);
					}
				});
			} else {
				this.doDistributeSealed(boosterCount);
			}
		},
		doDistributeSealed: function (boosterCount) {
			this.socket.emit("distributeSealed", boosterCount);
		},
		genCard: function (c) {
			if (!(c in this.cards)) {
				console.error(`Error: Card id '${c}' not found!`);
				return { id: c };
			}
			return {
				id: c,
				uniqueID: UniqueID++,
				name: this.cards[c].name,
				printed_name: this.cards[c].printed_name,
				image_uris: this.cards[c].image_uris,
				set: this.cards[c].set,
				rarity: this.cards[c].rarity,
				cmc: this.cards[c].cmc,
				collector_number: this.cards[c].collector_number,
				color_identity: this.cards[c].color_identity,
				in_booster: this.cards[c].in_booster,
			};
		},
		joinPublicSession: function () {
			this.sessionID = this.selectedPublicSession;
		},
		readyCheck: function () {
			if (this.userID != this.sessionOwner || this.drafting) return;

			if (this.socket.disconnected) {
				this.disconnectedReminder();
				return;
			}

			this.socket.emit("readyCheck", (anwser) => {
				if (anwser.code === 0) {
					this.initReadyCheck();
					this.socket.emit("setReady", ReadyState.Ready);
				}
			});
		},
		initReadyCheck: function () {
			this.pendingReadyCheck = true;

			for (let u of app.sessionUsers) u.readyState = ReadyState.Unknown;

			this.playSound("readyCheck");
		},
		stopReadyCheck: function () {
			this.pendingReadyCheck = false;

			for (let u of app.sessionUsers) u.readyState = ReadyState.DontCare;
		},
		startDraft: function () {
			if (this.userID != this.sessionOwner) return;
			if (this.deck.length > 0) {
				Swal.fire({
					title: "Are you sure?",
					text: "Launching a draft will reset everyones cards/deck!",
					type: "warning",
					showCancelButton: true,
					customClass: SwalCustomClasses,
					confirmButtonColor: "#3085d6",
					cancelButtonColor: "#d33",
					confirmButtonText: "I'm sure!",
				}).then((result) => {
					if (result.value) {
						this.socket.emit("startDraft");
					}
				});
			} else {
				this.socket.emit("startDraft");
			}
		},
		stopDraft: function () {
			if (this.userID != this.sessionOwner) return;
			const self = this;
			Swal.fire({
				title: "Are you sure?",
				text: "Do you really want to stop the draft here?",
				type: "warning",
				showCancelButton: true,
				customClass: SwalCustomClasses,
				confirmButtonColor: "#3085d6",
				cancelButtonColor: "#d33",
				confirmButtonText: "I'm sure!",
			}).then((result) => {
				if (result.value) {
					self.socket.emit("stopDraft");
				}
			});
		},
		shareSavedDraftLog: function () {
			if (this.userID != this.sessionOwner) {
				Swal.fire({
					title: "You need to be the session owner to share logs.",
					type: "error",
					customClass: SwalCustomClasses,
				});
				return;
			}
			let storedDraftLog = localStorage.getItem("draftLog");
			if (!storedDraftLog) {
				this.fireToast("error", "No saved draft log");
				this.savedDraftLog = false;
				return;
			} else {
				let parsedLogs = JSON.parse(storedDraftLog).draftLog;
				if (parsedLogs.sessionID !== this.sessionID) {
					Swal.fire({
						title: "Wrong Session ID",
						text: `Can't share logs: The session ID of your saved draft log ('${parsedLogs.sessionID}') doesn't match the id of yout current session ('${this.sessionID}').`,
						type: "error",
						customClass: SwalCustomClasses,
					});
					return;
				}
				this.savedDraftLog = false;
				this.draftLog = parsedLogs;
				this.socket.emit("shareDraftLog", this.draftLog);
				localStorage.setItem("draftLog", JSON.stringify(this.draftLog));
				this.fireToast("success", "Shared draft log with session!");
			}
		},
		sealedDialog: async function () {
			if (this.userID != this.sessionOwner) return;
			const { value: boosterCount } = await Swal.fire({
				title: "Start Sealed",
				showCancelButton: true,
				text: "How many booster for each player?",
				inputPlaceholder: "Booster count",
				input: "number",
				inputAttributes: {
					min: 4,
					max: 12,
					step: 1,
				},
				inputValue: 6,
				customClass: SwalCustomClasses,
				confirmButtonColor: "#3085d6",
				cancelButtonColor: "#d33",
				confirmButtonText: "Distribute boosters",
			});

			if (boosterCount) {
				this.distributeSealed(boosterCount);
			}
		},
		generateBracket: function () {
			if (this.userID != this.sessionOwner) return;
			const playerNames = this.sessionUsers.map((u) => u.userName);
			let players = [];
			const pairingOrder = [0, 4, 2, 6, 1, 5, 3, 7];
			for (let i = 0; i < 8; ++i) {
				if (pairingOrder[i] < playerNames.length) players[i] = playerNames[pairingOrder[i]];
				else players[i] = "";
			}
			this.socket.emit("generateBracket", players, (answer) => {
				if (answer.code === 0) app.displayBracket = true;
			});
		},
		updateBracket: function () {
			this.socket.emit("updateBracket", this.bracket.results);
		},
		addDeckColumn: function () {
			this.deckColumn.push([]);
			this.deckColumn[this.deckColumn.length - 1] = this.deckColumn[this.deckColumn.length - 2].filter(
				(c) => c.cmc > this.deckColumn.length - 2
			);
			this.deckColumn[this.deckColumn.length - 2] = this.deckColumn[this.deckColumn.length - 2].filter(
				(c) => c.cmc <= this.deckColumn.length - 2
			);
		},
		addSideboardColumn: function () {
			this.sideboardColumn.push([]);
			this.sideboardColumn[this.sideboardColumn.length - 1] = this.sideboardColumn[
				this.sideboardColumn.length - 2
			].filter((c) => c.cmc > this.sideboardColumn.length - 2);
			this.sideboardColumn[this.sideboardColumn.length - 2] = this.sideboardColumn[
				this.sideboardColumn.length - 2
			].filter((c) => c.cmc <= this.sideboardColumn.length - 2);
		},
		removeDeckColumn: function () {
			if (this.deckColumn.length < 2) return;
			this.deckColumn[this.deckColumn.length - 2] = [].concat(
				this.deckColumn[this.deckColumn.length - 2],
				this.deckColumn[this.deckColumn.length - 1]
			);
			this.deckColumn.pop();
		},
		removeSideboardColumn: function () {
			if (this.sideboardColumn.length < 2) return;
			this.sideboardColumn[this.sideboardColumn.length - 2] = [].concat(
				this.sideboardColumn[this.sideboardColumn.length - 2],
				this.sideboardColumn[this.sideboardColumn.length - 1]
			);
			this.sideboardColumn.pop();
		},
		// Sync. column changes with deck and sideboard
		columnDeckChange: function (e) {
			if (e.removed)
				this.deck.splice(
					this.deck.findIndex((c) => c === e.removed.element),
					1
				);
			if (e.added) this.deck.push(e.added.element);
		},
		columnSideboardChange: function (e) {
			if (e.removed)
				this.sideboard.splice(
					this.sideboard.findIndex((c) => c === e.removed.element),
					1
				);
			if (e.added) this.sideboard.push(e.added.element);
		},
		columnCMC: function (cards) {
			let a = cards.reduce((acc, item) => {
				if (!acc[item.cmc]) acc[item.cmc] = [];
				acc[item.cmc].push(item);
				return acc;
			}, {});
			for (let col in a) a[col] = this.orderByColor(a[col]);
			return a;
		},
		columnColor: function (cards) {
			let a = cards.reduce(
				(acc, item) => {
					if (item.color_identity.length > 1) {
						if (!acc["multi"]) acc["multi"] = [];
						acc["multi"].push(item);
					} else {
						if (!acc[item.color_identity]) acc[item.color_identity] = [];
						acc[item.color_identity].push(item);
					}
					return acc;
				},
				{ "": [], W: [], U: [], B: [], R: [], G: [], multi: [] }
			);
			for (let col in a) a[col] = this.orderByCMC(a[col]);
			return a;
		},
		idColumnCMC: function (cardids) {
			let a = cardids.reduce((acc, id) => {
				const cmc = Math.min(7, this.cards[id].cmc);
				if (!acc[cmc]) acc[cmc] = [];
				acc[cmc].push(id);
				return acc;
			}, {});
			for (let col in a) a[col] = this.orderByColor(a[col]);
			return a;
		},
		orderByColorInPlace: function (cards) {
			return cards.sort(function (lhs, rhs) {
				if (orderColor(lhs.color_identity, rhs.color_identity) == 0)
					if (lhs.cmc != rhs.cmc) return lhs.cmc - rhs.cmc;
					else return lhs.name < rhs.name;
				return orderColor(lhs.color_identity, rhs.color_identity);
			});
		},
		orderByCMC: function (cards) {
			return [...cards].sort(function (lhs, rhs) {
				if (lhs.cmc == rhs.cmc) return orderColor(lhs.color_identity, rhs.color_identity);
				return lhs.cmc - rhs.cmc;
			});
		},
		orderByColor: function (cards) {
			return this.orderByColorInPlace([...cards]);
		},
		orderByRarity: function (cards) {
			const order = { mythic: 0, rare: 1, uncommon: 2, common: 3 };
			return [...cards].sort(function (lhs, rhs) {
				if (order[lhs.rarity] == order[rhs.rarity]) return lhs.cmc - rhs.cmc;
				return order[lhs.rarity] - order[rhs.rarity];
			});
		},
		updateAutoLands: function () {
			if (this.autoLand) {
				if (!this.deck || this.deck.length === 0) return;

				const targetDeckSize = 40;
				const landToAdd = targetDeckSize - this.deck.length;
				if (landToAdd < 0) return;
				if (landToAdd === 0) {
					this.lands = { W: 0, U: 0, B: 0, R: 0, G: 0 };
					return;
				}

				const colorCount = this.colorsInDeck;
				let totalColor = 0;
				for (let c in colorCount) totalColor += colorCount[c];
				if (totalColor <= 0) return;

				for (let c in this.lands) this.lands[c] = Math.round(landToAdd * (colorCount[c] / totalColor));
				let addedLands = this.totalLands;

				if (this.deck.length + addedLands > targetDeckSize) {
					let max = "W";
					for (let i = 0; i < this.deck.length + addedLands - targetDeckSize; ++i) {
						for (let c in this.lands) if (this.lands[c] > this.lands[max]) max = c;
						this.lands[max] = Math.max(0, this.lands[max] - 1);
					}
				} else if (this.deck.length + addedLands < targetDeckSize) {
					let min = "W";
					for (let i = 0; i < targetDeckSize - (this.deck.length + addedLands); ++i) {
						for (let c in this.lands)
							if (
								this.colorsInDeck[min] == 0 ||
								(this.colorsInDeck[c] > 0 && this.lands[c] < this.lands[min])
							)
								min = c;
						this.lands[min] += 1;
					}
				}
			}
		},
		colorsInCardIDList: function (cardids) {
			let r = { W: 0, U: 0, B: 0, R: 0, G: 0 };
			if (!cardids) return r;
			for (let card of cardids) {
				for (let color of this.cards[card].color_identity) {
					r[color] += 1;
				}
			}
			return r;
		},
		colorsInCardPool: function (pool) {
			let r = { W: 0, U: 0, B: 0, R: 0, G: 0 };
			for (let card of pool) {
				for (let color of card.color_identity) {
					r[color] += 1;
				}
			}
			return r;
		},
	},
	computed: {
		DraftState: function () {
			return DraftState;
		},
		ReadyState: function () {
			return ReadyState;
		},
		cardsToBurnThisRound: function () {
			return Math.min(this.burnedCardsPerRound, this.booster.length - 1);
		},
		winstonCanSkipPile: function () {
			const s = this.winstonDraftState;
			return !(
				!s.remainingCards &&
				((s.currentPile === 0 && !s.piles[1].length && !s.piles[2].length) ||
					(s.currentPile === 1 && !s.piles[2].length) ||
					s.currentPile === 2)
			);
		},
		virtualPlayers: function () {
			if (!this.drafting || !this.virtualPlayersData || Object.keys(this.virtualPlayersData).length == 0)
				return this.sessionUsers;

			let r = [];
			for (let id in this.virtualPlayersData) {
				if (this.virtualPlayersData[id].isBot) {
					r.push(this.virtualPlayersData[id]);
					r[r.length - 1].userName = r[r.length - 1].instance.name;
					r[r.length - 1].userID = r[r.length - 1].instance.id;
				} else if (this.virtualPlayersData[id].disconnected) {
					r.push({
						userName: "(Disconnected)",
						userID: "",
						disconnected: true,
					});
				} else {
					r.push(this.sessionUsers.find((u) => u.userID === id));
				}
			}

			return r;
		},
		displaySets: function () {
			let dSets = [];
			for (let s of this.sets) {
				if (this.setsInfos && s in this.setsInfos)
					dSets.push({
						code: s,
						fullName: this.setsInfos[s].fullName,
						icon: this.setsInfos[s].icon,
					});
			}
			return dSets;
		},
		collectionStats: function () {
			if (!this.hasCollection || !this.cards || !this.setsInfos) return undefined;
			let stats = [];
			for (let id in this.cards) {
				let card = this.genCard(id);
				if (card && !["Plains", "Island", "Swamp", "Mountain", "Forest"].includes(card["name"])) {
					card.count = this.collection[id] ? this.collection[id] : 0;
					if (!(card.set in stats))
						stats[card.set] = {
							name: card.set,
							fullName: this.setsInfos[card.set].fullName,
							cards: [],
							cardCount: 0,
							common: [],
							uncommon: [],
							rare: [],
							mythic: [],
							commonCount: 0,
							uncommonCount: 0,
							rareCount: 0,
							mythicCount: 0,
							total: {
								unique: this.setsInfos[card.set].cardCount,
								commonCount: this.setsInfos[card.set]["commonCount"],
								uncommonCount: this.setsInfos[card.set]["uncommonCount"],
								rareCount: this.setsInfos[card.set]["rareCount"],
								mythicCount: this.setsInfos[card.set]["mythicCount"],
							},
						};
					stats[card.set].cards.push(card);
					stats[card.set].cardCount += card.count;
					stats[card.set][card.rarity].push(card);
					stats[card.set][card.rarity + "Count"] += card.count;
				}
			}
			return stats;
		},
		hasCollection: function () {
			return !isEmpty(this.collection);
		},

		extendedDraftLog: function () {
			let extendedDraftLog = [];
			for (let userID in this.draftLog.users) {
				extendedDraftLog.push({
					userID: userID,
					userName: this.draftLog.users[userID].userName,
					colors: this.colorsInCardIDList(this.draftLog.users[userID].cards),
				});
			}
			while (Object.keys(extendedDraftLog).length < 8)
				extendedDraftLog.push({
					userID: "none",
					userName: "(empty)",
					colors: this.colorsInCardIDList([]),
				});
			return extendedDraftLog;
		},

		colorsInDeck: function () {
			return this.colorsInCardPool(this.deck);
		},
		totalLands: function () {
			let addedLands = 0;
			for (let c in this.lands) addedLands += this.lands[c];
			return addedLands;
		},

		deckColumnCMC: function () {
			return this.columnCMC(this.deck);
		},
		deckColumnColor: function () {
			return this.columnColor(this.deck);
		},
		deckCMC: function () {
			return this.orderByCMC(this.deck);
		},
		deckColor: function () {
			return this.orderByColor(this.deck);
		},
		deckRarity: function () {
			return this.orderByRarity(this.deck);
		},

		sideboardColumnCMC: function () {
			return this.columnCMC(this.sideboard);
		},
		sideboardColumnColor: function () {
			return this.columnColor(this.sideboard);
		},
		sideboardCMC: function () {
			return this.orderByCMC(this.sideboard);
		},
		sideboardColor: function () {
			return this.orderByColor(this.sideboard);
		},
		sideboardRarity: function () {
			return this.orderByRarity(this.sideboard);
		},

		userByID: function () {
			let r = {};
			for (let u of this.sessionUsers) r[u.userID] = u;
			return r;
		},

		matches: function () {
			let m = [[], [], []];
			const Match = function (index, players) {
				this.index = index;
				this.players = players;
				this.isValid = function () {
					return (
						!this.players[0].empty && !this.players[1].empty && !this.players[0].tbd && !this.players[1].tbd
					);
				};
			};

			const winner = function (match) {
				if (match.players[0].empty && match.players[1].empty) return { empty: true };
				if (match.players[0].empty) return match.players[1];
				if (match.players[1].empty) return match.players[0];
				if (!app.bracket.results || app.bracket.results[match.index][0] === app.bracket.results[match.index][1])
					return { tbd: true };
				if (app.bracket.results[match.index][0] > app.bracket.results[match.index][1]) return match.players[0];
				else return match.players[1];
			};

			for (let i = 0; i < 4; ++i) {
				m[0].push(
					new Match(i, [
						this.bracket.players[2 * i] === "" ? { empty: true } : this.bracket.players[2 * i],
						this.bracket.players[2 * i + 1] === "" ? { empty: true } : this.bracket.players[2 * i + 1],
					])
				);
			}
			m[1].push(new Match(4, [winner(m[0][0]), winner(m[0][1])]));
			m[1].push(new Match(5, [winner(m[0][2]), winner(m[0][3])]));
			m[2].push(new Match(6, [winner(m[1][0]), winner(m[1][1])]));
			return m;
		},
	},
	mounted: async function () {
		// Load all card informations
		fetch("data/MTGACards.json").then(function (response) {
			response.text().then(function (text) {
				try {
					let parsed = JSON.parse(text);
					for (let c in parsed) {
						if (!("in_booster" in parsed[c])) parsed[c].in_booster = true;
						for (let l of app.languages) {
							if (!(l.code in parsed[c]["printed_name"]))
								parsed[c]["printed_name"][l.code] = parsed[c]["name"];
							if (!(l.code in parsed[c]["image_uris"]))
								parsed[c]["image_uris"][l.code] = parsed[c]["image_uris"]["en"];
						}
					}
					app.cards = Object.freeze(parsed); // Object.freeze so Vue doesn't make everything reactive.

					app.initialize();
				} catch (e) {
					alert(e);
				}
			});
		});

		// Load set informations
		fetch("data/SetsInfos.json").then(function (response) {
			response.text().then(function (text) {
				try {
					app.setsInfos = Object.freeze(JSON.parse(text));
				} catch (e) {
					alert(e);
				}
			});
		});
	},
	watch: {
		sessionID: function () {
			this.socket.query.sessionID = this.sessionID;
			this.socket.emit("setSession", this.sessionID);
			history.replaceState(
				{ sessionID: this.sessionID },
				`MTGADraft Session ${this.sessionID}`,
				`?session=${this.sessionID}`
			);
			setCookie("sessionID", this.sessionID);
		},
		userName: function () {
			this.socket.query.userName = this.userName;
			this.socket.emit("setUserName", this.userName);
			setCookie("userName", this.userName);
		},
		useCollection: function () {
			this.socket.emit("useCollection", this.useCollection);
			setCookie("useCollection", this.useCollection);
		},
		// Front-end options
		language: function () {
			setCookie("language", this.language);
		},
		pickOnDblclick: function () {
			setCookie("pickOnDblclick", this.pickOnDblclick);
		},
		enableSound: function () {
			setCookie("enableSound", this.enableSound);
		},
		hideSessionID: function () {
			setCookie("hideSessionID", this.hideSessionID);
		},
		cardOrder: function () {
			setCookie("cardOrder", this.cardOrder);
		},
		deck: function (newDeck, oldDeck) {
			this.updateAutoLands();

			// When replacing deck (not mutating it)
			if (oldDeck != newDeck) {
				this.deckColumn = [[], [], [], [], [], [], []];
				for (let c of newDeck) this.deckColumn[Math.min(c.cmc, this.deckColumn.length - 1)].push(c);
				for (let col = 0; col < this.deckColumn.length; ++col) this.orderByColorInPlace(this.deckColumn[col]);
			}
		},
		sideboard: function (newSide, oldSide) {
			// When replacing deck (not mutating it)
			if (newSide != oldSide) {
				this.sideboardColumn = [[], [], [], [], [], [], []];
				for (let c of newSide) this.sideboardColumn[Math.min(c.cmc, this.sideboardColumn.length - 1)].push(c);
			}
		},
		autoLand: function () {
			this.updateAutoLands();
		},
		// Session options
		ownerIsPlayer: function () {
			if (this.userID != this.sessionOwner) return;
			setCookie("userID", this.userID); // Used for reconnection
			this.socket.emit("setOwnerIsPlayer", this.ownerIsPlayer);
		},
		setRestriction: function () {
			if (this.userID != this.sessionOwner) return;

			this.socket.emit("setRestriction", this.setRestriction);
		},
		isPublic: function () {
			if (this.userID != this.sessionOwner) return;
			this.socket.emit("setPublic", this.isPublic);
		},
		boostersPerPlayer: function () {
			if (this.userID != this.sessionOwner) return;
			this.socket.emit("boostersPerPlayer", this.boostersPerPlayer);
		},
		customBoosters: function () {
			if (this.userID != this.sessionOwner) return;
			this.socket.emit("customBoosters", this.customBoosters);
		},
		bots: function () {
			if (this.userID != this.sessionOwner) return;
			this.socket.emit("bots", this.bots);
		},
		maxPlayers: function () {
			if (this.userID != this.sessionOwner) return;
			this.socket.emit("setMaxPlayers", this.maxPlayers);
		},
		mythicPromotion: function () {
			if (this.userID != this.sessionOwner) return;
			this.socket.emit("setMythicPromotion", this.mythicPromotion);
		},
		boosterContent: {
			deep: true,
			handler(val, oldValue) {
				if (this.userID != this.sessionOwner) return;
				if (Object.values(val).reduce((acc, val) => acc + val) <= 0) {
					this.fireToast("warning", "Your boosters should contain at least one card :)");
					this.boosterContent["common"] = 1;
				} else {
					this.socket.emit("setBoosterContent", this.boosterContent);
				}
			},
		},
		maxTimer: function () {
			if (this.userID != this.sessionOwner) return;
			this.socket.emit("setPickTimer", this.maxTimer);
		},
		ignoreCollections: function () {
			if (this.userID != this.sessionOwner) return;
			this.socket.emit("ignoreCollections", this.ignoreCollections);
		},
		maxDuplicates: {
			deep: true,
			handler() {
				if (this.userID != this.sessionOwner) return;
				this.socket.emit("setMaxDuplicates", this.maxDuplicates);
			},
		},
		colorBalance: function () {
			if (this.userID != this.sessionOwner) return;
			this.socket.emit("setColorBalance", this.colorBalance);
		},
		foil: function () {
			if (this.userID != this.sessionOwner) return;
			this.socket.emit("setFoil", this.foil);
		},
		useCustomCardList: function () {
			if (this.userID != this.sessionOwner) return;
			this.socket.emit("setUseCustomCardList", this.useCustomCardList);
		},
		burnedCardsPerRound: function () {
			if (this.userID != this.sessionOwner) return;
			this.socket.emit("setBurnedCardsPerRound", this.burnedCardsPerRound);
		},
		draftLogRecipients: function () {
			if (this.userID != this.sessionOwner) return;
			this.socket.emit("setDraftLogRecipients", this.draftLogRecipients);
		},
		enableNotifications: function () {
			setCookie("enableNotifications", this.enableNotifications);
		},
		draftLog: {
			deep: true,
			handler() {
				if (this.draftLog && this.draftLog.users && Object.keys(this.draftLog.users)[0])
					this.draftLogDisplayOptions.detailsUserID = Object.keys(this.draftLog.users)[0];
			},
		},
	},
};
</script>

<style>
#app {
	font-family: Avenir, Helvetica, Arial, sans-serif;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	text-align: center;
	color: #2c3e50;
	margin-top: 60px;
}
</style>
