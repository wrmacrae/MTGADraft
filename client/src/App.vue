<template>
	<div id="main-vue">
		<div v-show="cards == undefined">
			<div class="loading"></div>
			<span>Loading cards data...</span>
		</div>

		<div id="view-controls" class="main-controls">
			<span>
				<label for="user-name">User Name</label>
				<input type="text" id="user-name" name="user-name" v-model="userName" maxlength="50" />
				<div class="inline" v-tooltip="'Controls the display language of cards.'">
					<label for="language">Language</label>
					<select v-model="language" name="language">
						<option v-for="lang in languages" :key="lang.code" v-bind:value="lang.code">
							{{ lang.name }}
						</option>
					</select>
				</div>
			</span>
			<span>
				<label for="file-input">MTGA Collection</label>
				<input type="file" id="file-input" @change="parseMTGALog" style="display:none" accept=".log" />
				<button
					onclick="document.querySelector('#file-input').click()"
					v-tooltip="'Import your collection by uploading your Player.log file.'"
				>
					Upload
					<i v-if="hasCollection" class="fas fa-check green" v-tooltip="'Collection uploaded.'"></i>
				</button>
				<button
					v-if="hasCollection"
					v-tooltip="'Display some statistics about your collection.'"
					@click="showCollectionStats = true"
				>
					Stats
				</button>
				<div
					v-show="Object.keys(collection).length > 0"
					class="inline"
					v-tooltip="'Uncheck this to draft using every cards. Ignored when using a Custom Card List.'"
				>
					<input type="checkbox" v-model="useCollection" id="useCollection" />
					<label for="useCollection">Restrict to Collection</label>
				</div>
			</span>
			<span>
				<i
					class="fas clickable"
					:class="{ 'fa-volume-mute': !enableSound, 'fa-volume-up': enableSound }"
					@click="enableSound = !enableSound"
					v-tooltip="'Toggle sound.'"
				></i>
				<div class="inline" v-tooltip="'Allows you to pick cards by double clicking.'">
					<input type="checkbox" v-model="pickOnDblclick" id="pickOnDblclick" />
					<label for="pickOnDblclick">Pick on Double Click</label>
				</div>
				<span
					:class="{ disabled: notificationPermission == 'denied' }"
					v-tooltip="'Enable to get desktop notifications when your draft starts.'"
				>
					<input
						type="checkbox"
						v-model="enableNotifications"
						@change="checkNotificationPermission"
						id="notification-input"
					/>
					<label for="notification-input">Notifications</label>
				</span>
			</span>

			<span class="generic-container">
				<div v-show="publicSessions.length == 0" class="disable-warning">
					(No public sessions)
				</div>
				<span :class="{ disabled: drafting || publicSessions.length == 0 }" id="public-session-controls">
					<label for="public-sessions">Public sessions</label>
					<select id="public-sessions" v-model="selectedPublicSession">
						<option v-for="s in publicSessions" :value="s" :key="s">
							{{ s }}
						</option>
					</select>
					<input type="button" value="Join" @click="joinPublicSession" />
				</span>
			</span>
		</div>
		<div class="generic-container">
			<div id="limited-controls" class="main-controls" v-bind:class="{ disabled: drafting }">
				<span id="session-controls">
					<div class="inline" v-tooltip="'Share it with your friends!'">
						<label for="session-id">Session ID</label>
						<input :type="hideSessionID ? 'password' : 'text'" id="session-id" v-model="sessionID" />
					</div>
					<i
						class="far fa-fw clickable"
						:class="hideSessionID ? 'fa-eye' : 'fa-eye-slash'"
						@click="hideSessionID = !hideSessionID"
						v-tooltip="'Show/Hide your session ID.'"
					></i>
					<i
						class="fas fa-share-square clickable"
						style="padding:4px"
						v-tooltip="'Share your Session ID'"
						@click="sessionURLToClipboard"
					></i>
					<i
						class="fas fa-project-diagram clickable"
						v-if="sessionOwner === userID && !bracket"
						@click="generateBracket"
						v-tooltip="'Generate Bracket.'"
					></i>
					<i
						class="fas fa-project-diagram clickable"
						v-if="bracket"
						@click="displayBracket = true"
						v-tooltip="'Display Bracket.'"
					></i>
					<i
						class="fas fa-user-check clickable"
						v-if="sessionOwner === userID"
						@click="readyCheck"
						v-tooltip="'Ready Check: Ask everyone in your session if they\'re ready to play.'"
					></i>
				</span>
				<span class="generic-container" :class="{ disabled: sessionOwner != userID }">
					<strong>Session options:</strong>
					<template v-if="useCustomCardList">
						Using Custom Card List ({{ customCardList.length }} cards)
					</template>
					<template v-else>
						<div
							class="inline"
							v-tooltip="'Draft with all cards within set restriction disregarding players collections.'"
						>
							<input type="checkbox" v-model="ignoreCollections" id="ignore-collections" />
							<label for="ignore-collections">Ignore Collections</label>
						</div>
						<div class="inline">
							<label
								for="set-restriction"
								v-tooltip="
									'Restricts to the selected sets. No selection means all cards present in Arena.'
								"
							>
								Set(s)
							</label>
							<multiselect
								v-if="setsInfos"
								v-model="setRestriction"
								placeholder="All"
								:options="sets"
								:searchable="false"
								:allow-empty="true"
								:close-on-select="false"
								:multiple="true"
								select-label=""
								selected-label=""
								deselect-label=""
							>
								<template slot="selection" slot-scope="{ values }">
									<span class="multiselect__single" v-if="values.length == 1">
										<img class="set-icon" :src="setsInfos[values[0]].icon" />
										{{ setsInfos[values[0]].fullName }}
									</span>
									<span
										class="multiselect__single multiselect__single_nooverflow"
										v-if="values.length > 1"
									>
										({{ values.length }})
										<img
											v-for="v in values"
											class="set-icon"
											:key="v"
											:src="'./assets/' + setsInfos[v].icon"
										/>
									</span>
								</template>
								<template slot="option" slot-scope="{ option }">
									<span class="multiselect__option">{{ setsInfos[option].fullName }}</span>
								</template>
							</multiselect>
						</div>
					</template>
				</span>
				<span class="generic-container" :class="{ disabled: sessionOwner != userID }">
					<strong>Draft:</strong>
					<div class="inline" v-tooltip="'Add some dumb bots to your draft.'">
						<label for="bots">Bots</label>
						<input
							type="number"
							id="bots"
							class="small-number-input"
							min="0"
							max="7"
							step="1"
							v-model.number="bots"
						/>
					</div>
					<div class="inline" v-tooltip="'Pick Timer (sec.). Zero means no timer.'">
						<label for="timer"><i class="fas fa-clock"></i></label>
						<input
							type="number"
							id="timer"
							class="small-number-input"
							min="0"
							max="180"
							step="15"
							v-model.number="maxTimer"
						/>
					</div>
					<button @click="startDraft" v-tooltip="'Starts a Draft Session.'">Draft</button>
				</span>
				<span class="generic-container" :class="{ disabled: sessionOwner != userID }">
					<button
						@click="startWinstonDraft()"
						v-tooltip="'Starts a Winston Draft. This is a draft variant for only two players.'"
					>
						Winston
					</button>
				</span>
				<span class="generic-container" :class="{ disabled: sessionOwner != userID }">
					<button @click="sealedDialog" v-tooltip="'Distributes boosters to everyone for a sealed session.'">
						Sealed
					</button>
				</span>
				<span
					v-tooltip="'More session options'"
					@click="modal = 'SessionOptions'"
					class="more-option clickable"
				>
					More
					<i class="fas fa-bars"></i>
				</span>
			</div>
			<div v-show="drafting" id="draft-in-progress">
				Draft in progress!
				<button v-if="sessionOwner == userID" class="stop" @click="stopDraft">Stop Draft</button>
			</div>
		</div>
		<div class="main-controls session-players">
			<div
				v-if="!ownerIsPlayer"
				class="generic-container"
				v-tooltip="'Non-playing session owner.'"
				style="margin-right: 0.5em"
			>
				{{ sessionOwnerUsername ? sessionOwnerUsername : "(Disconnected)" }}
				<i
					class="fas fa-crown subtle-gold"
					v-tooltip="
						sessionOwnerUsername
							? `${sessionOwnerUsername} is the session's owner.`
							: 'Session owner is disconnected.'
					"
				></i>
				<div class="chat-bubble" :id="'chat-bubble-' + sessionOwner"></div>
			</div>
			<div>
				<span v-tooltip="'Maximum players can be adjusted in session options.'">
					Players ({{ sessionUsers.length }}/{{ maxPlayers }})
				</span>
				<i
					v-if="userID == sessionOwner && !drafting"
					class="fas fa-random clickable"
					@click="randomizeSeating"
					v-tooltip="'Randomize Seating Order'"
				></i>
			</div>
			<template v-if="!drafting">
				<draggable
					tag="ul"
					class="player-list"
					v-model="userOrder"
					@change="changePlayerOrder"
					:disabled="userID != sessionOwner || drafting"
				>
					<li
						v-for="(id, idx) in userOrder"
						:key="id"
						:class="{ draggable: userID === sessionOwner && !drafting, bot: userByID[id].isBot }"
						:set="(user = userByID[id])"
						:data-userid="id"
					>
						<span class="player-name">{{ user.userName }}</span>
						<template v-if="userID == sessionOwner">
							<i
								class="fas fa-chevron-left clickable move-player move-player-left"
								v-tooltip="`Move ${user.userName} to the left`"
								@click="movePlayer(idx, -1)"
							></i>
							<i
								class="fas fa-chevron-right clickable move-player move-player-right"
								v-tooltip="`Move ${user.userName} to the right`"
								@click="movePlayer(idx, 1)"
							></i>
						</template>
						<div class="status-icons">
							<i
								v-if="id === sessionOwner"
								class="fas fa-crown subtle-gold"
								v-tooltip="`${user.userName} is the session's owner.`"
							></i>
							<template v-if="userID === sessionOwner && id != sessionOwner">
								<i
									class="fas fa-user-plus clickable subtle-gold"
									v-tooltip="`Give session ownership to ${user.userName}`"
									@click="setSessionOwner(id)"
								></i>
								<i
									class="fas fa-user-slash clickable red"
									v-tooltip="`Remove ${user.userName} from the session`"
									@click="removePlayer(id)"
								></i>
							</template>
							<template v-if="!useCustomCardList && !ignoreCollections">
								<template v-if="!user.collection">
									<i
										class="fas fa-book red"
										v-tooltip="user.userName + ' have not uploaded their collection yet.'"
									></i>
								</template>
								<template v-else-if="user.collection && !user.useCollection">
									<i
										class="fas fa-book yellow"
										v-tooltip="
											user.userName + ' have uploaded their collection, but are not using it.'
										"
									></i>
								</template>
								<template v-else>
									<i
										class="fas fa-book green"
										v-tooltip="user.userName + ' have uploaded their collection.'"
									></i>
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
									<i
										class="fas fa-spinner fa-spin"
										v-tooltip="`Waiting on ${user.userName} to respond...`"
									></i>
								</template>
							</template>
						</div>
						<div class="chat-bubble" :id="'chat-bubble-' + id"></div>
					</li>
				</draggable>
			</template>
			<template v-else>
				<ul class="player-list">
					<li
						v-for="user in virtualPlayers"
						:key="user.userID"
						:class="{ bot: user.isBot }"
						:data-userid="user.userID"
					>
						<i
							class="fas fa-angle-double-left passing-order-left"
							v-show="boosterNumber % 2 == 1"
							v-tooltip="'Passing order'"
						></i>
						<i
							class="fas fa-angle-double-right passing-order-right"
							v-show="boosterNumber % 2 == 0"
							v-tooltip="'Passing order'"
						></i>
						<span class="player-name">{{ user.userName }}</span>
						<template v-if="!user.isBot && !user.disconnected">
							<div class="status-icons">
								<i
									v-if="user.userID === sessionOwner"
									class="fas fa-crown subtle-gold"
									v-tooltip="`${user.userName} is the session's owner.`"
								></i>
								<template v-if="userID === sessionOwner && user.userID != sessionOwner">
									<i
										class="fas fa-user-plus clickable subtle-gold"
										v-if="ownerIsPlayer"
										v-tooltip="`Give session ownership to ${user.userName}`"
										@click="setSessionOwner(user.userID)"
									></i>
									<i
										class="fas fa-user-slash clickable red"
										v-tooltip="`Remove ${user.userName} from the session`"
										@click="removePlayer(user.userID)"
									></i>
								</template>
								<template v-if="winstonDraftState">
									<i
										v-show="user.userID === winstonDraftState.currentPlayer"
										class="fas fa-spinner fa-spin"
										v-tooltip="user.userName + ' is thinking...'"
									></i>
								</template>
								<template v-else>
									<template v-if="user.pickedThisRound">
										<i
											class="fas fa-check green"
											v-tooltip="user.userName + ' has picked a card.'"
										></i>
									</template>
									<template v-else>
										<i
											class="fas fa-spinner fa-spin"
											v-tooltip="user.userName + ' is thinking...'"
										></i>
									</template>
								</template>
							</div>
							<div class="chat-bubble" :id="'chat-bubble-' + user.userID"></div>
						</template>
					</li>
				</ul>
			</template>
			<div>
				<button
					@click="shareSavedDraftLog"
					v-show="savedDraftLog"
					v-tooltip="'Reveal and share previous draft log with players in your session.'"
				>
					Share saved Draft Log
				</button>
				<button
					@click="displayDraftLog = !displayDraftLog"
					v-show="draftLog"
					v-tooltip="'Displays logs of your previous draft'"
				>
					Draft Log
				</button>
			</div>
			<div class="chat">
				<form @submit.prevent="sendChatMessage">
					<input
						type="text"
						v-model="currentChatMessage"
						placeholder="Chat with players in your session."
						maxlength="255"
					/>
				</form>
				<i
					class="far fa-comments clickable"
					@click="displayChatHistory = !displayChatHistory"
					v-tooltip="'Display chat history.'"
				></i>
				<div
					class="chat-history"
					v-show="displayChatHistory"
					@focusout="displayChatHistory = false"
					tabindex="0"
				>
					<template v-if="messagesHistory && messagesHistory.length > 0">
						<ol>
							<li
								v-for="msg in messagesHistory.slice().reverse()"
								:key="msg.timestamp"
								:title="new Date(msg.timestamp)"
							>
								<span class="chat-author">
									{{ msg.author in userByID ? userByID[msg.author].userName : "(Left)" }}
								</span>
								<span class="chat-message">{{ msg.text }}</span>
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
					<div v-show="pickTimer >= 0">
						<i class="fas fa-clock"></i>
						{{ pickTimer }}
					</div>
					<div>Booster #{{ boosterNumber }}, Pick #{{ pickNumber }}</div>
				</div>
				<div v-if="draftLog && draftLog.sessionID === sessionID" class="draft-watching-live-log">
					<draft-log-live :draftlog="draftLog"></draft-log-live>
				</div>
			</div>
			<div v-show="draftingState == DraftState.Waiting" class="pick-waiting">
				<span class="spinner"></span>
				<span v-show="pickTimer >= 0">
					(
					<i class="fas fa-clock"></i>
					{{ pickTimer }})
				</span>
				Waiting for other players to pick...
			</div>
			<div v-show="draftingState == DraftState.Picking" id="booster-container" class="container">
				<div id="booster-controls" class="controls">
					<h2>Your Booster</h2>
					<span>Booster #{{ boosterNumber }}, Pick {{ pickNumber }}</span>
					<span v-show="pickTimer >= 0" :class="{ redbg: pickTimer <= 10 }" id="chrono">
						<i class="fas fa-clock"></i>
						{{ pickTimer }}
					</span>
					<input
						type="button"
						@click="pickCard"
						value="Confirm Pick"
						v-if="
							selectedCard != undefined &&
								(burningCards.length === burnedCardsPerRound ||
									booster.length === 1 + burningCards.length)
						"
					/>
					<span v-else>
						Pick a card
						<span v-if="cardsToBurnThisRound > 0">
							and remove {{ cardsToBurnThisRound }} cards from the pool ({{ burningCards.length }}/{{
								cardsToBurnThisRound
							}})
						</span>
					</span>
				</div>
				<div class="booster card-container">
					<div
						is="card"
						v-for="(card, index) in booster"
						v-bind:key="`${index}-${card.id}`"
						v-bind:card="card"
						v-bind:language="language"
						v-bind:selectcard="selectCard"
						v-bind:ondblclick="doubleClickCard"
						v-bind:selected="selectedCard === card"
						:canbeburned="burnedCardsPerRound > 0"
						:burned="burningCards.includes(card)"
						:burn="burnCard"
						:restore="restoreCard"
					></div>
				</div>
			</div>
			<WinstonDraft
				v-if="draftingState === DraftState.WinstonPicking || draftingState === DraftState.WinstonWaiting"
			></WinstonDraft>
		</template>
		<div
			class="container"
			v-show="
				(deck !== undefined && deck.length > 0) ||
					(drafting && draftingState !== DraftState.Watching) ||
					this.draftingState == DraftState.Brewing
			"
		>
			<div id="brewing-controls" class="controls">
				<h2>Deck ({{ deck.length }})</h2>
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
					<input type="checkbox" id="autoLand" v-model="autoLand" />
					<label for="autoLand" v-tooltip="'If set, will complete your deck to 40 cards with basic lands.'">
						Auto. Land
					</label>
					<label for="white-mana"><img src="img/mana/W.svg" class="mana-icon" /></label>
					<input
						class="small-number-input"
						type="number"
						id="white-mana"
						v-model.number="lands['W']"
						min="0"
					/>
					<label for="blue-mana"><img src="img/mana/U.svg" class="mana-icon" /></label>
					<input
						class="small-number-input"
						type="number"
						id="blue-mana"
						v-model.number="lands['U']"
						min="0"
					/>
					<label for="black-mana"><img src="img/mana/B.svg" class="mana-icon" /></label>
					<input
						class="small-number-input"
						type="number"
						id="black-mana"
						v-model.number="lands['B']"
						min="0"
					/>
					<label for="red-mana"><img src="img/mana/R.svg" class="mana-icon" /></label>
					<input class="small-number-input" type="number" id="red-mana" v-model.number="lands['R']" min="0" />
					<label for="green-mana"><img src="img/mana/G.svg" class="mana-icon" /></label>
					<input
						class="small-number-input"
						type="number"
						id="green-mana"
						v-model.number="lands['G']"
						min="0"
					/>
					{{ totalLands }} basic lands for a total of {{ deck.length + totalLands }} cards
				</span>
			</div>
			<div
				class="card-container"
				:class="
					['CMCColumns', 'ColorColumns', 'DraggableCMC'].includes(cardOrder) ? 'card-columns' : 'card-pool'
				"
			>
				<div v-if="deck.length == 0" class="empty-warning">
					<h3>Your deck is currently empty!</h3>
					<p>Click on your cards to add them to your deck.</p>
				</div>
				<template v-if="cardOrder == 'DraggableCMC'">
					<draggable
						v-for="(column, colIdx) in deckColumn"
						:key="'deck' + colIdx"
						class="cmc-column drag-column"
						:list="column"
						group="cardColumn"
						@change="columnDeckChange"
					>
						<figure
							is="card"
							v-for="card in column"
							:key="card.uniqueID"
							v-bind:card="card"
							v-bind:language="language"
							v-bind:selectcard="deckToSideboard"
						></figure>
					</draggable>
					<div class="draggable-controls">
						<div @click="addDeckColumn" class="plus-column"><i class="fas fa-plus fa-2x"></i></div>
						<div v-show="deckColumn.length > 1" @click="removeDeckColumn" class="minus-column">
							<i class="fas fa-minus fa-2x"></i>
						</div>
					</div>
				</template>
				<template v-else-if="cardOrder == 'CMCColumns'">
					<div v-for="(cmc_column, colIndex) in deckColumnCMC" :key="colIndex" class="cmc-column">
						<figure
							is="card"
							v-for="(card, index) in cmc_column"
							v-bind:key="index"
							v-bind:card="card"
							v-bind:language="language"
							v-bind:selectcard="deckToSideboard"
						></figure>
					</div>
				</template>
				<template v-else-if="cardOrder == 'ColorColumns'">
					<div
						v-for="(column, colIndex) in deckColumnColor"
						:key="colIndex"
						class="cmc-column"
						v-show="column.length > 0"
					>
						<figure
							is="card"
							v-for="card in column"
							v-bind:key="card.uniqueID"
							v-bind:card="card"
							v-bind:language="language"
							v-bind:selectcard="deckToSideboard"
						></figure>
					</div>
				</template>
				<template v-else>
					<figure
						is="card"
						v-for="card in { CMC: deckCMC, Color: deckColor, Rarity: deckRarity, '': deck }[cardOrder]"
						v-bind:key="card.uniqueID"
						v-bind:card="card"
						v-bind:language="language"
						v-bind:selectcard="deckToSideboard"
					></figure>
				</template>
			</div>
		</div>
		<div
			v-show="
				(sideboard != undefined && sideboard.length > 0) ||
					(drafting && draftingState !== DraftState.Watching) ||
					draftingState == DraftState.Brewing
			"
			id="card-pool-container"
			class="container"
		>
			<div id="card-pool-controls" class="controls">
				<h2>
					Sideboard (
					<span id="sideboard-length" style="display:inline-block">{{ sideboard.length }}</span>
					)
				</h2>
			</div>
			<div
				class="card-container"
				:class="
					['CMCColumns', 'ColorColumns', 'DraggableCMC'].includes(cardOrder) ? 'card-columns' : 'card-pool'
				"
			>
				<div v-if="sideboard.length == 0" class="empty-warning">
					<h3>Your sideboard is currently empty!</h3>
					<p>Click on cards in your deck to sideboard them.</p>
				</div>
				<template v-if="cardOrder == 'DraggableCMC'">
					<draggable
						v-for="(column, colIdx) in sideboardColumn"
						:key="'side' + colIdx"
						class="cmc-column drag-column"
						:list="column"
						group="cardColumn"
						@change="columnSideboardChange"
					>
						<figure
							is="card"
							v-for="card in column"
							v-bind:key="card.uniqueID"
							v-bind:card="card"
							v-bind:language="language"
							v-bind:selectcard="sideboardToDeck"
						></figure>
					</draggable>
					<div class="draggable-controls">
						<div @click="addSideboardColumn" class="plus-column"><i class="fas fa-plus fa-2x"></i></div>
						<div v-show="sideboardColumn.length > 1" @click="removeSideboardColumn" class="minus-column">
							<i class="fas fa-minus fa-2x"></i>
						</div>
					</div>
				</template>
				<template v-else-if="cardOrder == 'CMCColumns'">
					<div v-for="(cmc_column, colIndex) in sideboardColumnCMC" :key="colIndex" class="cmc-column">
						<figure
							is="card"
							v-for="card in cmc_column"
							v-bind:key="card.uniqueID"
							v-bind:card="card"
							v-bind:language="language"
							v-bind:selectcard="sideboardToDeck"
						></figure>
					</div>
				</template>
				<template v-else-if="cardOrder == 'ColorColumns'">
					<div
						v-for="(column, index) in sideboardColumnColor"
						:key="index"
						class="cmc-column"
						v-show="column.length > 0"
					>
						<figure
							is="card"
							v-for="card in column"
							v-bind:key="card.uniqueID"
							v-bind:card="card"
							v-bind:language="language"
							v-bind:selectcard="sideboardToDeck"
						></figure>
					</div>
				</template>
				<template v-else>
					<figure
						is="card"
						v-for="card in {
							CMC: sideboardCMC,
							Color: sideboardColor,
							Rarity: sideboardRarity,
							'': sideboard,
						}[cardOrder]"
						v-bind:key="card.uniqueID"
						v-bind:card="card"
						v-bind:language="language"
						v-bind:selectcard="sideboardToDeck"
					></figure>
				</template>
			</div>
		</div>
		<welcome v-if="draftingState === null"></welcome>
		<SessionOptions v-show="modal === 'SessionOptions'"></SessionOptions>
		<footer>
			<span @click="displayAbout = true"><a>About</a></span>
			<span>
				<input type="file" id="log-input" @change="openLog" style="display:none" accept=".txt" />
				<a onclick="document.querySelector('#log-input').click()" v-tooltip="'Open a saved draft log.'">
					Open Draft Log
				</a>
			</span>
			<span>
				Made by
				<a href="http://senryoku.github.io/">Senryoku</a>
			</span>
			<span><a href="mailto:mtgadraft@gmail.com">Contact</a></span>
			<span>
				Get
				<a href="https://magic.wizards.com/fr/mtgarena">Magic: The Gathering Arena</a>
			</span>
		</footer>
		<div
			class="disconnected-icon"
			v-if="socket && socket.disconnected"
			v-tooltip="
				'You are disconnected from the server, some functionnalities won\'t be available until the connection is re-established.'
			"
		>
			<i class="fas fa-exclamation-triangle"></i>
			Disconnected
		</div>
	</div>
</template>

<script>
import Vue from "vue";
import VTooltip from "v-tooltip";
import draggable from "vuedraggable";
import Welcome from "./components/Welcome.vue";
import SessionOptions from "./components/SessionOptions.vue";
import { Languages, MTGSets, SwalCustomClasses } from "./constants.js";
import {
	isEmpty,
	guid,
	shortguid,
	getUrlVars,
	download,
	copyToClipboard,
	exportMTGA,
	exportToMagicProTools,
} from "./helper.js";
import { getCookie, setCookie } from "./cookies.js";
import io from "socket.io-client";
import Swal from "sweetalert2";
import Multiselect from "vue-multiselect";

import Cards from "./assets/data/MTGACards.json";
import SetsInfos from "./assets/data/SetsInfos.json";

const ColorOrder = { W: 0, U: 1, B: 2, R: 3, G: 4 };
function orderColor(lhs, rhs) {
	if (!lhs || !rhs) return 0;
	if (lhs.length == 1 && rhs.length == 1) return ColorOrder[lhs[0]] - ColorOrder[rhs[0]];
	else if (lhs.length == 1) return -1;
	else if (rhs.length == 1) return 1;
	else return String(lhs.flat()).localeCompare(String(rhs.flat()));
}

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
	start: new Audio(require("./assets/sound/drop_003.ogg")),
	next: new Audio(require("./assets/sound/next.mp3")),
	countdown: new Audio(require("./assets/sound/click_001.ogg")),
	readyCheck: new Audio(require("./assets/sound/drop_003.ogg")),
};

let UniqueID = 0;

Vue.use(VTooltip);
VTooltip.options.defaultPlacement = "bottom-start";
VTooltip.options.defaultBoundariesElement = "window";

export default {
	name: "App",
	components: {
		Welcome,
		SessionOptions,
		Multiselect,
		draggable,
	},
	data: function() {
		return {
			// Card Data
			cards: null,

			// User Data
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
		};
	},
	methods: {
		initialize: function() {
			let storedUserID = getCookie("userID", null);
			if (storedUserID != null) {
				this.userID = storedUserID;
				// Server will handle the reconnect attempt if draft is still ongoing
				console.log("storedUserID: " + storedUserID);
			}

			// Socket Setup
			console.log("Mode:", process.env.NODE_ENV);
			if (process.env.NODE_ENV === "development") {
				this.socket = io("localhost:3000", {
					query: {
						userID: this.userID,
						sessionID: this.sessionID,
						userName: this.userName,
					},
				});
			} else {
				this.socket = io({
					query: {
						userID: this.userID,
						sessionID: this.sessionID,
						userName: this.userName,
					},
				});
			}

			this.socket.on("disconnect", function() {
				console.log("Disconnected from server.");
				Swal.fire({
					customClass: SwalCustomClasses,
					type: "error",
					title: "Disconnected!",
					showConfirmButton: false,
				});
			});

			this.socket.on("reconnect", function(attemptNumber) {
				console.log(`Reconnected to server (attempt ${attemptNumber}).`);

				Swal.fire({
					customClass: SwalCustomClasses,
					type: "warning",
					title: "Reconnected!",
					timer: 1500,
				});
			});

			this.socket.on("alreadyConnected", newID => {
				this.userID = newID;
				this.socket.query.userID = newID;
			});

			this.socket.on("chatMessage", message => {
				this.messagesHistory.push(message);
				// TODO: Cleanup this?
				let bubble = document.querySelector("#chat-bubble-" + message.author);
				bubble.innerText = message.text;
				bubble.style.opacity = 1;
				if (bubble.timeoutHandler) clearTimeout(bubble.timeoutHandler);
				bubble.timeoutHandler = window.setTimeout(() => (bubble.style.opacity = 0), 5000);
			});

			this.socket.on("publicSessions", sessions => {
				this.publicSessions = sessions;
			});

			this.socket.on("setSession", sessionID => {
				this.sessionID = sessionID;
				this.socket.query.sessionID = sessionID;
				if (this.drafting) {
					// Expelled during drafting
					this.drafting = false;
					this.draftingState = DraftState.Brewing;
				}
			});

			this.socket.on("sessionUsers", users => {
				for (let u of users) {
					u.pickedThisRound = false;
					u.readyState = ReadyState.DontCare;
				}

				this.sessionUsers = users;
				this.userOrder = users.map(u => u.userID);
			});

			this.socket.on("userDisconnected", userNames => {
				if (!this.drafting) return;

				if (this.winstonDraftState) {
					Swal.fire({
						position: "center",
						customClass: SwalCustomClasses,
						type: "error",
						title: `Player(s) disconnected`,
						text: `Wait for ${userNames.join(", ")} to come back or...`,
						showConfirmButton: true,
						allowOutsideClick: false,
						confirmButtonText: "Stop draft",
					}).then(result => {
						if (result.value) this.socket.emit("stopDraft");
					});
				} else {
					if (this.userID == this.sessionOwner) {
						Swal.fire({
							position: "center",
							customClass: SwalCustomClasses,
							type: "error",
							title: `Player(s) disconnected`,
							text: `Wait for ${userNames.join(", ")} to come back or...`,
							showConfirmButton: true,
							allowOutsideClick: false,
							confirmButtonText: "Replace with a bot",
						}).then(result => {
							if (result.value) this.socket.emit("replaceDisconnectedPlayers");
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

			this.socket.on("updateUser", data => {
				let user = this.userByID[data.userID];
				if (!user) {
					if (data.userID === this.sessionOwner && data.updatedProperties.userName)
						this.sessionOwnerUsername = data.updatedProperties.userName;
					return;
				}

				for (let prop in data.updatedProperties) {
					user[prop] = data.updatedProperties[prop];
				}
			});

			this.socket.on("sessionOptions", sessionOptions => {
				for (let prop in sessionOptions) {
					this[prop] = sessionOptions[prop];
				}
			});
			this.socket.on("sessionOwner", (ownerID, ownerUserName) => {
				this.sessionOwner = ownerID;
				if (ownerUserName) this.sessionOwnerUsername = ownerUserName;
			});
			this.socket.on("isPublic", data => {
				this.isPublic = data;
			});
			this.socket.on("ignoreCollections", ignoreCollections => {
				this.ignoreCollections = ignoreCollections;
			});
			this.socket.on("boostersPerPlayer", data => {
				this.boostersPerPlayer = parseInt(data);
			});
			this.socket.on("bots", data => {
				this.bots = parseInt(data);
			});
			this.socket.on("setMaxPlayers", maxPlayers => {
				this.maxPlayers = parseInt(maxPlayers);
			});
			this.socket.on("setRestriction", setRestriction => {
				this.setRestriction = setRestriction;
			});
			this.socket.on("setPickTimer", timer => {
				this.maxTimer = timer;
			});

			this.socket.on("message", data => {
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

			this.socket.on("readyCheck", () => {
				if (this.drafting) return;

				this.initReadyCheck();

				if (this.enableNotifications) {
					new Notification("Are you ready?", {
						body: `${this.userByID[this.sessionOwner].userName} has initiated a ready check`,
					});
				}

				const ownerUsername =
					this.sessionOwner in this.userByID
						? this.userByID[this.sessionOwner].userName
						: this.sessionOwnerUsername
						? this.sessionOwnerUsername
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
				}).then(result => {
					this.socket.emit("setReady", result.value ? ReadyState.Ready : ReadyState.NotReady);
				});
			});

			this.socket.on("setReady", (userID, readyState) => {
				if (!this.pendingReadyCheck) return;
				if (userID in this.userByID) this.userByID[userID].readyState = readyState;
				if (this.sessionUsers.every(u => u.readyState === ReadyState.Ready))
					this.fireToast("success", "Everybody is ready!");
			});

			this.socket.on("startWinstonDraft", state => {
				setCookie("userID", this.userID);
				this.drafting = true;
				this.setWinstonDraftState(state);
				this.stopReadyCheck();
				this.sideboard = [];
				this.deck = [];
				this.playSound("start");
				Swal.fire({
					position: "center",
					type: "success",
					title: "Starting Winston Draft!",
					customClass: SwalCustomClasses,
					showConfirmButton: false,
					timer: 1500,
				});

				if (this.enableNotifications) {
					new Notification("Now drafting!", {
						body: `Your Winston draft '${this.sessionID}' is starting!`,
					});
				}
			});
			this.socket.on("winstonDraftSync", winstonDraftState => {
				this.setWinstonDraftState(winstonDraftState);
			});
			this.socket.on("winstonDraftNextRound", currentUser => {
				if (this.userID === currentUser) {
					this.playSound("next");
					this.fireToast("success", "Your turn!");
					if (this.enableNotifications) {
						new Notification("Your turn!", {
							body: `This is your turn to pick.`,
						});
					}
					this.draftingState = DraftState.WinstonPicking;
				} else {
					this.draftingState = DraftState.WinstonWaiting;
				}
			});
			this.socket.on("winstonDraftEnd", () => {
				this.drafting = false;
				this.winstonDraftState = null;
				this.draftingState = DraftState.Brewing;
				this.fireToast("success", "Done drafting!");
			});
			this.socket.on("winstonDraftRandomCard", card => {
				const c = this.genCard(card);
				this.addToDeck(c);
				Swal.fire({
					position: "center",
					title: `You drew ${c.printed_name[this.language]} from the card pool!`,
					imageUrl: c.image_uris[this.language],
					imageAlt: c.printed_name[this.language],
					imageWidth: 250,
					customClass: SwalCustomClasses,
					showConfirmButton: true,
				});
			});

			this.socket.on("rejoinWinstonDraft", data => {
				this.drafting = true;

				this.setWinstonDraftState(data.state);
				this.sideboard = [];
				this.deck = [];
				for (let c of data.pickedCards) this.addToDeck(this.cards[c]);

				if (this.userID === data.state.currentUser) this.draftingState = DraftState.WinstonPicking;
				else this.draftingState = DraftState.WinstonWaiting;

				Swal.fire({
					position: "center",
					type: "success",
					title: "Reconnected to the Winston draft!",
					customClass: SwalCustomClasses,
					showConfirmButton: false,
					timer: 1500,
				});
			});

			this.socket.on("startDraft", () => {
				// Save user ID in case of disconnect
				setCookie("userID", this.userID);

				this.drafting = true;
				this.stopReadyCheck();
				this.sideboard = [];
				this.deck = [];
				Swal.fire({
					position: "center",
					type: "success",
					title: "Now drafting!",
					customClass: SwalCustomClasses,
					showConfirmButton: false,
					timer: 1500,
				});

				this.playSound("start");

				if (this.enableNotifications) {
					new Notification("Now drafting!", {
						body: `Your draft '${this.sessionID}' is starting!`,
					});
				}

				// Are we just an Organizer, and not a player?
				if (!this.virtualPlayers.map(u => u.userID).includes(this.userID)) {
					this.draftingState = DraftState.Watching;
				}
			});

			this.socket.on("rejoinDraft", data => {
				this.drafting = true;

				this.sideboard = [];
				this.deck = [];
				for (let c of data.pickedCards) this.addToDeck(this.genCard(c));

				this.booster = [];
				for (let c of data.booster) {
					this.booster.push(this.genCard(c));
				}
				this.boosterNumber = data.boosterNumber;
				this.pickNumber = data.pickNumber;

				this.pickedThisRound = data.pickedThisRound;
				if (this.pickedThisRound) this.draftingState = DraftState.Waiting;
				else this.draftingState = DraftState.Picking;
				this.selectedCard = undefined;
				this.burningCards = [];

				Swal.fire({
					position: "center",
					type: "success",
					title: "Reconnected to the draft!",
					customClass: SwalCustomClasses,
					showConfirmButton: false,
					timer: 1500,
				});
			});

			this.socket.on("nextBooster", data => {
				this.booster = [];
				for (let u of this.sessionUsers) {
					u.pickedThisRound = false;
				}
				this.boosterNumber = data.boosterNumber;
				this.pickNumber = data.pickNumber;

				// Only watching, not playing/receiving a boost ourself.
				if (this.draftingState == DraftState.Watching) return;

				for (let c of data.booster) {
					this.booster.push(this.genCard(c));
				}
				this.playSound("next");
				this.draftingState = DraftState.Picking;
			});

			this.socket.on("endDraft", () => {
				Swal.fire({
					position: "center",
					type: "success",
					title: "Done drafting!",
					showConfirmButton: false,
					customClass: SwalCustomClasses,
					timer: 1500,
				});
				this.drafting = false;
				if (this.draftingState === DraftState.Watching) {
					this.draftingState = undefined;
				} else {
					// User was playing
					this.draftingState = DraftState.Brewing;
				}
			});

			this.socket.on("draftLog", draftLog => {
				if (draftLog.delayed && draftLog.delayed === true) {
					localStorage.setItem("draftLog", JSON.stringify(draftLog));
					this.draftLog = undefined;
					this.savedDraftLog = true;
				} else {
					localStorage.setItem("draftLog", JSON.stringify(draftLog));
					this.draftLog = draftLog;
				}
			});

			this.socket.on("pickAlert", data => {
				this.fireToast(
					"info",
					`${data.userName} picked ${this.cards[data.cardID].printed_name[this.language]}!`
				);
			});

			this.socket.on("setCardSelection", data => {
				this.sideboard = [];
				this.deck = [];
				for (let c of data.flat()) {
					this.deck.push(this.genCard(c));
				}
				this.draftingState = DraftState.Brewing;
				// Hide waiting popup for sealed
				if (Swal.isVisible()) Swal.close();
			});

			this.socket.on("timer", data => {
				if (data.countdown == 0) this.forcePick(this.booster);
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
				if (data.countdown > 0 && data.countdown <= 5) this.playSound("countdown");
				this.pickTimer = data.countdown;
			});

			this.socket.on("disableTimer", () => {
				this.pickTimer = -1;
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
		playSound: function(key) {
			if (this.enableSound) Sounds[key].play();
		},
		// Chat Methods
		sendChatMessage: function(/*event*/) {
			if (!this.currentChatMessage || this.currentChatMessage == "") return;
			this.socket.emit("chatMessage", {
				author: this.userID,
				timestamp: Date.now(),
				text: this.currentChatMessage,
			});
			this.currentChatMessage = "";
		},
		// Draft Methods
		selectCard: function(e, c) {
			this.selectedCard = c;
			this.restoreCard(null, c);
		},
		burnCard: function(e, c) {
			if (this.burningCards.includes(c)) return;
			this.burningCards.push(c);
			if (this.burningCards.length > this.burnedCardsPerRound) this.burningCards.shift();
			if (e) e.stopPropagation();
		},
		restoreCard: function(e, c) {
			if (!this.burningCards.includes(c)) return;
			this.burningCards.splice(
				this.burningCards.findIndex(o => o === c),
				1
			);
			if (e) e.stopPropagation();
		},
		doubleClickCard: function(e, c) {
			this.selectCard(e, c);
			if (this.pickOnDblclick) this.pickCard();
		},
		addToDeck: function(card) {
			// Handle column sync.
			this.deck.push(card);
			this.deckColumn[Math.min(card.cmc, this.deckColumn.length - 1)].push(card);
		},
		addToSideboard: function(card) {
			// Handle column sync.
			this.sideboard.push(card);
			this.sideboardColumn[Math.min(card.cmc, this.sideboardColumn.length - 1)].push(card);
		},
		pickCard: function() {
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
				{ selectedCard: this.selectedCard.id, burnedCards: this.burningCards.map(c => c.id) },
				answer => {
					if (answer.code !== 0) alert(`pickCard: Unexpected answer: ${answer.error}`);
				}
			);
			this.draftingState = DraftState.Waiting;
			this.addToDeck(this.selectedCard);
			this.selectedCard = undefined;
			this.burningCards = [];
		},
		forcePick: function() {
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
				{ selectedCard: this.selectedCard.id, burnedCards: this.burningCards.map(c => c.id) },
				anwser => {
					if (anwser.code !== 0) alert(`pickCard: Unexpected answer:`, anwser);
				}
			);
			this.draftingState = DraftState.Waiting;
			this.addToDeck(this.selectedCard);
			this.selectedCard = undefined;
			this.burningCards = [];
		},
		setWinstonDraftState: function(state) {
			this.winstonDraftState = state;
			const piles = [];
			for (let p of state.piles) {
				let pile = [];
				for (let c of p) pile.push(this.genCard(c));
				piles.push(pile);
			}
			this.winstonDraftState.piles = piles;
		},
		startWinstonDraft: async function() {
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
		winstonDraftTakePile: function() {
			const cards = this.winstonDraftState.piles[this.winstonDraftState.currentPile];
			this.socket.emit("winstonDraftTakePile", answer => {
				if (answer.code === 0) {
					for (let c of cards) this.addToDeck(c);
				} else alert("Error: ", answer.error);
			});
		},
		winstonDraftSkipPile: function() {
			this.socket.emit("winstonDraftSkipPile", answer => {
				if (answer.code !== 0) alert("Error: ", answer.error);
			});
		},
		checkNotificationPermission: function(e) {
			if (e.target.checked && typeof Notification !== "undefined" && Notification.permission != "granted") {
				Notification.requestPermission().then(function(permission) {
					this.notificationPermission = permission;
					if (permission != "granted") {
						this.enableNotifications = false;
					}
				});
			}
		},
		deckToSideboard: function(e, c) {
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
		sideboardToDeck: function(e, c) {
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
		setCollection: function(json) {
			if (this.collection == json) return;
			this.collection = Object.freeze(json);
			this.socket.emit("setCollection", this.collection);
		},
		parseMTGALog: function(e) {
			let file = e.target.files[0];
			if (!file) return;
			let reader = new FileReader();
			reader.onload = async e => {
				let contents = e.target.result;

				let playerIds = new Set(Array.from(contents.matchAll(/"playerId":"([^"]+)"/g)).map(e => e[1]));

				const parseCollection = function(contents, startIdx = null) {
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
							cardids = Object.keys(collections[i]).filter(id => cardids.includes(id));
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
					this.setCollection(collection);
					Swal.fire({
						position: "top-end",
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
		fireToast: function(type, title) {
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
		disconnectedReminder: function() {
			this.fireToast("error", "Disconnected from server!");
		},
		exportDeck: function() {
			copyToClipboard(exportMTGA(this.deck, this.sideboard, this.language, this.lands));
			this.fireToast("success", "Deck exported to clipboard!");
		},
		downloadLog: function() {
			let draftLogFull = this.draftLog;
			for (let e in this.draftLog.users) {
				let cards = [];
				for (let c of this.draftLog.users[e].cards) cards.push(this.cards[c]);
				this.draftLog.users[e].exportString = exportMTGA(cards, null, this.language);
			}
			download(`DraftLog_${this.draftLog.sessionID}.txt`, JSON.stringify(draftLogFull, null, "\t"));
		},
		openLog: function(e) {
			let file = e.target.files[0];
			if (!file) {
				return;
			}
			var reader = new FileReader();
			reader.onload = e => {
				try {
					let contents = e.target.result;
					let json = JSON.parse(contents);
					if (json.users) {
						this.draftLog = json;
						this.displayDraftLog = true;
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
		exportSingleLog: function(id) {
			let cards = [];
			for (let c of this.draftLog.users[id].cards) cards.push(this.cards[c]);
			copyToClipboard(exportMTGA(cards, null, this.language), null, "\t");
			this.fireToast("success", "Card list exported to clipboard!");
		},
		downloadMPT: function(id) {
			download(`DraftLog_${id}.txt`, exportToMagicProTools(this.cards, this.draftLog, id));
		},
		submitToMPT: function(id) {
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
			}).then(response => {
				if (response.status !== 200) {
					this.fireToast("error", "An error occured submiting log to MagicProTools.");
				} else {
					response.json().then(function(json) {
						if (json.error) {
							this.fireToast("error", `Error: ${json.error}.`);
						} else {
							if (json.url) {
								copyToClipboard(json.url);
								this.fireToast("success", "MagicProTools URL copied to clipboard.");
								window.open(json.url, "_blank");
							} else {
								this.fireToast("error", "An error occured submiting log to MagicProTools.");
							}
						}
					});
				}
			});
		},
		sessionURLToClipboard: function() {
			copyToClipboard(
				`${window.location.protocol}//${window.location.hostname}:${window.location.port}/?session=${encodeURI(
					this.sessionID
				)}`
			);
			this.fireToast("success", "Session link copied to clipboard!");
		},
		toggleSetRestriction: function(code) {
			if (this.setRestriction.includes(code))
				this.setRestriction.splice(
					this.setRestriction.findIndex(c => c === code),
					1
				);
			else this.setRestriction.push(code);
		},
		setSessionOwner: function(newOwnerID) {
			if (this.userID != this.sessionOwner) return;
			let user = this.sessionUsers.find(u => u.userID === newOwnerID);
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
			}).then(result => {
				if (result.value) {
					this.socket.emit("setSessionOwner", newOwnerID);
				}
			});
		},
		removePlayer: function(userID) {
			if (this.userID != this.sessionOwner) return;
			let user = this.sessionUsers.find(u => u.userID === userID);
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
			}).then(result => {
				if (result.value) {
					this.socket.emit("removePlayer", userID);
				}
			});
		},
		movePlayer: function(idx, dir) {
			if (this.userID != this.sessionOwner) return;

			const negMod = (m, n) => ((m % n) + n) % n;
			let other = negMod(idx + dir, this.userOrder.length);
			[this.userOrder[idx], this.userOrder[other]] = [this.userOrder[other], this.userOrder[idx]];

			this.socket.emit("setSeating", this.userOrder);
		},
		changePlayerOrder: function() {
			if (this.userID != this.sessionOwner) return;
			this.socket.emit("setSeating", this.userOrder);
		},
		randomizeSeating: function() {
			if (this.userID != this.sessionOwner) return;
			this.socket.emit("randomizeSeating");
		},
		distributeSealed: function(boosterCount) {
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
				}).then(result => {
					if (result.value) {
						this.doDistributeSealed(boosterCount);
					}
				});
			} else {
				this.doDistributeSealed(boosterCount);
			}
		},
		doDistributeSealed: function(boosterCount) {
			this.socket.emit("distributeSealed", boosterCount);
		},
		genCard: function(c) {
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
		joinPublicSession: function() {
			this.sessionID = this.selectedPublicSession;
		},
		readyCheck: function() {
			if (this.userID != this.sessionOwner || this.drafting) return;

			if (this.socket.disconnected) {
				this.disconnectedReminder();
				return;
			}

			this.socket.emit("readyCheck", anwser => {
				if (anwser.code === 0) {
					this.initReadyCheck();
					this.socket.emit("setReady", ReadyState.Ready);
				}
			});
		},
		initReadyCheck: function() {
			this.pendingReadyCheck = true;

			for (let u of this.sessionUsers) u.readyState = ReadyState.Unknown;

			this.playSound("readyCheck");
		},
		stopReadyCheck: function() {
			this.pendingReadyCheck = false;

			for (let u of this.sessionUsers) u.readyState = ReadyState.DontCare;
		},
		startDraft: function() {
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
				}).then(result => {
					if (result.value) {
						this.socket.emit("startDraft");
					}
				});
			} else {
				this.socket.emit("startDraft");
			}
		},
		stopDraft: function() {
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
			}).then(result => {
				if (result.value) {
					self.socket.emit("stopDraft");
				}
			});
		},
		shareSavedDraftLog: function() {
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
		sealedDialog: async function() {
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
		generateBracket: function() {
			if (this.userID != this.sessionOwner) return;
			const playerNames = this.sessionUsers.map(u => u.userName);
			let players = [];
			const pairingOrder = [0, 4, 2, 6, 1, 5, 3, 7];
			for (let i = 0; i < 8; ++i) {
				if (pairingOrder[i] < playerNames.length) players[i] = playerNames[pairingOrder[i]];
				else players[i] = "";
			}
			this.socket.emit("generateBracket", players, answer => {
				if (answer.code === 0) this.displayBracket = true;
			});
		},
		updateBracket: function() {
			this.socket.emit("updateBracket", this.bracket.results);
		},
		addDeckColumn: function() {
			this.deckColumn.push([]);
			this.deckColumn[this.deckColumn.length - 1] = this.deckColumn[this.deckColumn.length - 2].filter(
				c => c.cmc > this.deckColumn.length - 2
			);
			this.deckColumn[this.deckColumn.length - 2] = this.deckColumn[this.deckColumn.length - 2].filter(
				c => c.cmc <= this.deckColumn.length - 2
			);
		},
		addSideboardColumn: function() {
			this.sideboardColumn.push([]);
			this.sideboardColumn[this.sideboardColumn.length - 1] = this.sideboardColumn[
				this.sideboardColumn.length - 2
			].filter(c => c.cmc > this.sideboardColumn.length - 2);
			this.sideboardColumn[this.sideboardColumn.length - 2] = this.sideboardColumn[
				this.sideboardColumn.length - 2
			].filter(c => c.cmc <= this.sideboardColumn.length - 2);
		},
		removeDeckColumn: function() {
			if (this.deckColumn.length < 2) return;
			this.deckColumn[this.deckColumn.length - 2] = [].concat(
				this.deckColumn[this.deckColumn.length - 2],
				this.deckColumn[this.deckColumn.length - 1]
			);
			this.deckColumn.pop();
		},
		removeSideboardColumn: function() {
			if (this.sideboardColumn.length < 2) return;
			this.sideboardColumn[this.sideboardColumn.length - 2] = [].concat(
				this.sideboardColumn[this.sideboardColumn.length - 2],
				this.sideboardColumn[this.sideboardColumn.length - 1]
			);
			this.sideboardColumn.pop();
		},
		// Sync. column changes with deck and sideboard
		columnDeckChange: function(e) {
			if (e.removed)
				this.deck.splice(
					this.deck.findIndex(c => c === e.removed.element),
					1
				);
			if (e.added) this.deck.push(e.added.element);
		},
		columnSideboardChange: function(e) {
			if (e.removed)
				this.sideboard.splice(
					this.sideboard.findIndex(c => c === e.removed.element),
					1
				);
			if (e.added) this.sideboard.push(e.added.element);
		},
		columnCMC: function(cards) {
			let a = cards.reduce((acc, item) => {
				if (!acc[item.cmc]) acc[item.cmc] = [];
				acc[item.cmc].push(item);
				return acc;
			}, {});
			for (let col in a) a[col] = this.orderByColor(a[col]);
			return a;
		},
		columnColor: function(cards) {
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
		idColumnCMC: function(cardids) {
			let a = cardids.reduce((acc, id) => {
				const cmc = Math.min(7, this.cards[id].cmc);
				if (!acc[cmc]) acc[cmc] = [];
				acc[cmc].push(id);
				return acc;
			}, {});
			for (let col in a) a[col] = this.orderByColor(a[col]);
			return a;
		},
		orderByColorInPlace: function(cards) {
			return cards.sort(function(lhs, rhs) {
				if (orderColor(lhs.color_identity, rhs.color_identity) == 0)
					if (lhs.cmc != rhs.cmc) return lhs.cmc - rhs.cmc;
					else return lhs.name < rhs.name;
				return orderColor(lhs.color_identity, rhs.color_identity);
			});
		},
		orderByCMC: function(cards) {
			return [...cards].sort(function(lhs, rhs) {
				if (lhs.cmc == rhs.cmc) return orderColor(lhs.color_identity, rhs.color_identity);
				return lhs.cmc - rhs.cmc;
			});
		},
		orderByColor: function(cards) {
			return this.orderByColorInPlace([...cards]);
		},
		orderByRarity: function(cards) {
			const order = { mythic: 0, rare: 1, uncommon: 2, common: 3 };
			return [...cards].sort(function(lhs, rhs) {
				if (order[lhs.rarity] == order[rhs.rarity]) return lhs.cmc - rhs.cmc;
				return order[lhs.rarity] - order[rhs.rarity];
			});
		},
		updateAutoLands: function() {
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
		colorsInCardIDList: function(cardids) {
			let r = { W: 0, U: 0, B: 0, R: 0, G: 0 };
			if (!cardids) return r;
			for (let card of cardids) {
				for (let color of this.cards[card].color_identity) {
					r[color] += 1;
				}
			}
			return r;
		},
		colorsInCardPool: function(pool) {
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
		DraftState: function() {
			return DraftState;
		},
		ReadyState: function() {
			return ReadyState;
		},
		cardsToBurnThisRound: function() {
			return Math.min(this.burnedCardsPerRound, this.booster.length - 1);
		},
		winstonCanSkipPile: function() {
			const s = this.winstonDraftState;
			return !(
				!s.remainingCards &&
				((s.currentPile === 0 && !s.piles[1].length && !s.piles[2].length) ||
					(s.currentPile === 1 && !s.piles[2].length) ||
					s.currentPile === 2)
			);
		},
		virtualPlayers: function() {
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
					r.push(this.sessionUsers.find(u => u.userID === id));
				}
			}

			return r;
		},
		displaySets: function() {
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
		collectionStats: function() {
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
		hasCollection: function() {
			return !isEmpty(this.collection);
		},

		extendedDraftLog: function() {
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

		colorsInDeck: function() {
			return this.colorsInCardPool(this.deck);
		},
		totalLands: function() {
			let addedLands = 0;
			for (let c in this.lands) addedLands += this.lands[c];
			return addedLands;
		},

		deckColumnCMC: function() {
			return this.columnCMC(this.deck);
		},
		deckColumnColor: function() {
			return this.columnColor(this.deck);
		},
		deckCMC: function() {
			return this.orderByCMC(this.deck);
		},
		deckColor: function() {
			return this.orderByColor(this.deck);
		},
		deckRarity: function() {
			return this.orderByRarity(this.deck);
		},

		sideboardColumnCMC: function() {
			return this.columnCMC(this.sideboard);
		},
		sideboardColumnColor: function() {
			return this.columnColor(this.sideboard);
		},
		sideboardCMC: function() {
			return this.orderByCMC(this.sideboard);
		},
		sideboardColor: function() {
			return this.orderByColor(this.sideboard);
		},
		sideboardRarity: function() {
			return this.orderByRarity(this.sideboard);
		},

		userByID: function() {
			let r = {};
			for (let u of this.sessionUsers) r[u.userID] = u;
			return r;
		},

		matches: function() {
			let m = [[], [], []];
			const Match = function(index, players) {
				this.index = index;
				this.players = players;
				this.isValid = function() {
					return (
						!this.players[0].empty && !this.players[1].empty && !this.players[0].tbd && !this.players[1].tbd
					);
				};
			};

			const winner = match => {
				if (match.players[0].empty && match.players[1].empty) return { empty: true };
				if (match.players[0].empty) return match.players[1];
				if (match.players[1].empty) return match.players[0];
				if (
					!this.bracket.results ||
					this.bracket.results[match.index][0] === this.bracket.results[match.index][1]
				)
					return { tbd: true };
				if (this.bracket.results[match.index][0] > this.bracket.results[match.index][1])
					return match.players[0];
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
	mounted: async function() {
		console.log("Coucou");
		// Load all card informations
		fetch(require("./assets/data/MTGACards.json")).then(response => {
			response.text().then(text => {
				try {
					let parsed = Cards;
					for (let c in parsed) {
						if (!("in_booster" in parsed[c])) parsed[c].in_booster = true;
						for (let l of this.languages) {
							if (!(l.code in parsed[c]["printed_name"]))
								parsed[c]["printed_name"][l.code] = parsed[c]["name"];
							if (!(l.code in parsed[c]["image_uris"]))
								parsed[c]["image_uris"][l.code] = parsed[c]["image_uris"]["en"];
						}
					}
					this.cards = Object.freeze(parsed); // Object.freeze so Vue doesn't make everything reactive.

					this.initialize();
				} catch (e) {
					console.log(text);
					alert(e);
				}
			});
		});

		// Load set informations
		this.setsInfos = Object.freeze(SetsInfos);
	},
	watch: {
		sessionID: function() {
			this.socket.query.sessionID = this.sessionID;
			this.socket.emit("setSession", this.sessionID);
			history.replaceState(
				{ sessionID: this.sessionID },
				`MTGADraft Session ${this.sessionID}`,
				`?session=${this.sessionID}`
			);
			setCookie("sessionID", this.sessionID);
		},
		userName: function() {
			this.socket.query.userName = this.userName;
			this.socket.emit("setUserName", this.userName);
			setCookie("userName", this.userName);
		},
		useCollection: function() {
			this.socket.emit("useCollection", this.useCollection);
			setCookie("useCollection", this.useCollection);
		},
		// Front-end options
		language: function() {
			setCookie("language", this.language);
		},
		pickOnDblclick: function() {
			setCookie("pickOnDblclick", this.pickOnDblclick);
		},
		enableSound: function() {
			setCookie("enableSound", this.enableSound);
		},
		hideSessionID: function() {
			setCookie("hideSessionID", this.hideSessionID);
		},
		cardOrder: function() {
			setCookie("cardOrder", this.cardOrder);
		},
		deck: function(newDeck, oldDeck) {
			this.updateAutoLands();

			// When replacing deck (not mutating it)
			if (oldDeck != newDeck) {
				this.deckColumn = [[], [], [], [], [], [], []];
				for (let c of newDeck) this.deckColumn[Math.min(c.cmc, this.deckColumn.length - 1)].push(c);
				for (let col = 0; col < this.deckColumn.length; ++col) this.orderByColorInPlace(this.deckColumn[col]);
			}
		},
		sideboard: function(newSide, oldSide) {
			// When replacing deck (not mutating it)
			if (newSide != oldSide) {
				this.sideboardColumn = [[], [], [], [], [], [], []];
				for (let c of newSide) this.sideboardColumn[Math.min(c.cmc, this.sideboardColumn.length - 1)].push(c);
			}
		},
		autoLand: function() {
			this.updateAutoLands();
		},
		// Session options
		ownerIsPlayer: function() {
			if (this.userID != this.sessionOwner) return;
			setCookie("userID", this.userID); // Used for reconnection
			this.socket.emit("setOwnerIsPlayer", this.ownerIsPlayer);
		},
		setRestriction: function() {
			if (this.userID != this.sessionOwner) return;

			this.socket.emit("setRestriction", this.setRestriction);
		},
		isPublic: function() {
			if (this.userID != this.sessionOwner) return;
			this.socket.emit("setPublic", this.isPublic);
		},
		boostersPerPlayer: function() {
			if (this.userID != this.sessionOwner) return;
			this.socket.emit("boostersPerPlayer", this.boostersPerPlayer);
		},
		distributionMode: function () {
			if (this.userID != this.sessionOwner) return;
			this.socket.emit("setDistributionMode", this.distributionMode);
		},
		customBoosters: function() {
			if (this.userID != this.sessionOwner) return;
			this.socket.emit("setCustomBoosters", this.customBoosters);
		},
		bots: function() {
			if (this.userID != this.sessionOwner) return;
			this.socket.emit("bots", this.bots);
		},
		maxPlayers: function() {
			if (this.userID != this.sessionOwner) return;
			this.socket.emit("setMaxPlayers", this.maxPlayers);
		},
		mythicPromotion: function() {
			if (this.userID != this.sessionOwner) return;
			this.socket.emit("setMythicPromotion", this.mythicPromotion);
		},
		boosterContent: {
			deep: true,
			handler(val) {
				if (this.userID != this.sessionOwner) return;
				if (Object.values(val).reduce((acc, val) => acc + val) <= 0) {
					this.fireToast("warning", "Your boosters should contain at least one card :)");
					this.boosterContent["common"] = 1;
				} else {
					this.socket.emit("setBoosterContent", this.boosterContent);
				}
			},
		},
		maxTimer: function() {
			if (this.userID != this.sessionOwner) return;
			this.socket.emit("setPickTimer", this.maxTimer);
		},
		ignoreCollections: function() {
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
		colorBalance: function() {
			if (this.userID != this.sessionOwner) return;
			this.socket.emit("setColorBalance", this.colorBalance);
		},
		foil: function() {
			if (this.userID != this.sessionOwner) return;
			this.socket.emit("setFoil", this.foil);
		},
		useCustomCardList: function() {
			if (this.userID != this.sessionOwner) return;
			this.socket.emit("setUseCustomCardList", this.useCustomCardList);
		},
		burnedCardsPerRound: function() {
			if (this.userID != this.sessionOwner) return;
			this.socket.emit("setBurnedCardsPerRound", this.burnedCardsPerRound);
		},
		draftLogRecipients: function() {
			if (this.userID != this.sessionOwner) return;
			this.socket.emit("setDraftLogRecipients", this.draftLogRecipients);
		},
		enableNotifications: function() {
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

<style src="./assets/css/tooltip.css"></style>
<style src="vue-multiselect/dist/vue-multiselect.min.css"></style>

<style>
#app {
	font-family: Avenir, Helvetica, Arial, sans-serif;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	text-align: center;
	color: #2c3e50;
	margin-top: 60px;
}

body {
	margin: 0;
	margin-left: 0;
	background-color: rgb(32, 32, 32);
	background-image: url("./assets/img/iko-min.png");
	background-position: 85% -100px;
	background-repeat: no-repeat;
	background-size: 40%;
	color: #ddd;
	font-family: "Raleway", "HelveticaNeue", "Helvetica Neue", Helvetica, Arial, sans-serif;

	position: relative;
	min-height: calc(100vh - 2em);
	padding-bottom: 2em;
}

footer {
	position: absolute;
	bottom: 0;
	right: 0;
	left: 0;
	padding: 1em;
	background: linear-gradient(to top, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0));
	display: flex;
	justify-content: flex-end;
}

footer span {
	margin-left: 2em;
}

.disconnected-icon {
	position: fixed;
	right: 2em;
	bottom: 3em;
	padding: 1em;
	background-color: darkred;
	border-radius: 0.5em;
	z-index: 999;
	box-shadow: 0 0 10px black;
	font-weight: bold;
}

.custom-swal-popup,
.custom-swal-title,
.custom-swal-content {
	color: #ddd !important;
	background: #282828 !important;
}

a,
a:visited {
	color: #3666b3;
	text-decoration: none;
	cursor: pointer;
}

a:hover {
	color: #72a7ff;
}

.capitalized {
	text-transform: capitalize;
}

.inline {
	display: inline-block;
}

.clickable {
	cursor: pointer;
}

.clickable:hover {
	color: #fff;
}

.green {
	color: green;
}

.yellow {
	color: yellow;
}

.red {
	color: DarkRed;
}

.blue {
	color: #3666b3;
}

.gold {
	color: gold;
}

.subtle-gold {
	text-shadow: 0 0 1px gold;
}

.redbg {
	background-color: DarkRed;
	border-radius: 0.2em;
}

.disabled {
	pointer-events: none;
	opacity: 0.3;
	background: repeating-linear-gradient(45deg, #282828, #282828 10px, #383838 10px, #383838 20px);
}

#main-vue {
	padding: 1em;
	padding-top: 0.5em;
}

#main-vue .multiselect {
	display: inline-block;
	vertical-align: baseline;
	width: 14.5em;
	min-height: auto;
}

#main-vue .multiselect__tags,
#main-vue .multiselect__single,
#main-vue .multiselect__element,
#main-vue .multiselect__content-wrapper {
	color: #ddd;
	background: #555;
}

#main-vue .multiselect__tags {
	border-radius: 4px;
	border: 1px solid #888;
	height: 28px;
	min-height: auto;
	padding: 5px 5px;
}

#main-vue .multiselect__option {
	font-size: 14px;
	min-height: auto;
	line-height: inherit;
	padding: 5px;
}

#main-vue .multiselect__option::after {
	line-height: 36px;
	font-size: 10px;
	padding-left: inherit;
	font-family: "Font Awesome 5 Free";
}

#main-vue .multiselect__tag {
	background: #333;
}

#main-vue .multiselect__placeholder {
	padding-top: 0;
	padding-bottom: 0;
	margin-bottom: 0;
}

#main-vue .multiselect--active .multiselect__placeholder {
	display: inline-block;
}

#main-vue .multiselect__single {
	margin-bottom: 0;
	line-height: inherit;
	min-height: auto;
	width: auto;
	font-size: inherit;
}

#main-vue .multiselect__single_nooverflow {
	overflow: hidden;
	max-height: 1em;
	max-width: 12em;
}

#main-vue .multiselect__single_nooverflow .set-icon {
	margin-right: 0.2em;
}

#main-vue .multiselect__select {
	top: 40%;
	bottom: 60%;
	right: 0;
	height: auto;
}

#main-vue .multiselect__select::before {
	top: 2.5px;
}

#main-vue .set-icon {
	display: inline-block;
	height: 1em;
	vertical-align: baseline;
	filter: invert(100%) sepia(0%) saturate(7500%) hue-rotate(27deg) brightness(101%) contrast(99%);
}

.mana-icon {
	display: inline-block;
	height: 1em;
	vertical-align: middle;
}

#main-vue .multiselect__tag-icon {
	color: #bf5d5d;
}

#main-vue select,
#main-vue option,
#main-vue input[type="text"],
#main-vue input[type="password"],
#main-vue input[type="button"],
#main-vue input[type="number"],
#main-vue button,
.check-button + label {
	color: #ddd;
	background-color: #555;
	border-radius: 4px;
	border: 1px solid #888;
	padding: 5px 5px;
	margin: 0.25em;
}

#main-vue input[type="button"],
#main-vue button {
	box-shadow: inset 2px 2px 8px -3px #888, inset -2px -2px 8px -3px #000;
}

#main-vue input[type="button"]:active,
#main-vue button:active {
	box-shadow: inset 2px 2px 8px -3px #000, inset -2px -2px 8px -3px #888;
	transform: translateY(2px);
}

#main-vue .button,
#main-vue button,
#main-vue input[type="button"],
#main-vue input[type="submit"],
#main-vue input[type="reset"],
#main-vue input[type="button"],
.check-button + label {
	display: inline-block;
	height: 28px;
	padding: 0 15px;
	text-align: center;
	font-size: 11px;
	font-weight: 600;
	line-height: 28px;
	letter-spacing: 0.1rem;
	text-transform: uppercase;
	text-decoration: none;
	white-space: nowrap;
	background-color: transparent;
	cursor: pointer;
	box-sizing: border-box;
}

.check-button-container {
	display: inline-block;
	position: relative;
	margin: 0;
	padding: 0;
}

.check-button {
	position: absolute;
	left: 0;
	top: 0;
	width: 100%;
	height: 100%;
	-webkit-appearance: none;
	-moz-appearance: none;
	-ms-appearance: none;
	appearance: none;
	border: none;
	padding: 0;
	border-radius: 0;
	vertical-align: middle;
	background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg version='1.1' id='Layer_1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' x='0px' y='0px' width='512px' height='512px' viewBox='0 0 32 32' style='enable-background:new 0 0 512 512;' xml:space='preserve'%3e%3cpath d='M448,71.9c-17.3-13.4-41.5-9.3-54.1,9.1L214,344.2l-99.1-107.3c-14.6-16.6-39.1-17.4-54.7-1.8 c-15.6,15.5-16.4,41.6-1.7,58.1c0,0,120.4,133.6,137.7,147c17.3,13.4,41.5,9.3,54.1-9.1l206.3-301.7 C469.2,110.9,465.3,85.2,448,71.9z'/%3e%3c/svg%3e");
	background-repeat: no-repeat;
	background-size: cover;
	background-color: transparent;
	background-position: -10em -10em;
	transition: 0.3s ease;
	outline: 0;
}

.check-button:active + label {
	background-color: #888;
}

.check-button:checked + label {
	box-shadow: 0 0 2px 1px green;
}

.check-button:checked:after {
	font-family: "Font Awesome 5 Free";
	content: "\f00c";
	z-index: 3;
	font-weight: 900;
	position: absolute;
	top: 0;
	right: 0;
	font-size: 2em;
	color: green;
}

#main-vue button:disabled {
	color: #555;
	cursor: auto;
}

#main-vue .button:hover:enabled,
#main-vue button:hover:enabled,
#main-vue input[type="submit"]:hover:enabled,
#main-vue input[type="reset"]:hover:enabled,
#main-vue input[type="button"]:hover:enabled,
.check-button:hover:enabled + label,
#main-vue .button:focus,
#main-vue button:focus,
#main-vue input[type="submit"]:focus,
#main-vue input[type="reset"]:focus,
#main-vue input[type="button"]:focus,
.check-button + label:focus {
	color: #fff;
	border-color: #bbb;
	outline: 0;
}

#session-more-options {
	position: absolute;
	top: 100%;
	right: 0;
	background-color: #333;
	border-radius: 4px;
	border: 1px solid #888;
	width: 20em;
	padding: 1em;
}

.session-options-container {
	display: flex;
}

.session-options-container h4 {
	margin: 0.25em;
}

/**** checkbox-button ****/

.checkbox-button {
	position: relative;
	display: inline-block;
	margin: 0.5em;
	padding: 0.25em;
	border-radius: 0.25em;
	background-color: #666;
	cursor: pointer;

	height: 25px;
	box-shadow: inset 1px 1px 4px 0 #bbb, inset -1px -1px 4px 0 #222;
}

.checkbox-button:hover {
	background-color: #888;
}

.checkbox-button[data-checked="true"] {
	box-shadow: 0px 0px 3px 2px #ccc, inset 1px 1px 4px 0 #222, inset -1px -1px 4px 0 #bbb;
}

.checkbox-button label {
	line-height: 25px;
}

/* Hide default checkbox */
.checkbox-button input {
	position: absolute;
	opacity: 0;
	cursor: pointer;
	height: 0;
	width: 0;
}

/* ********************* */

.set-list {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	margin: auto;
}

.set-list img {
	height: 25px;
	max-width: 25px;
	max-height: 25px;
}

.option-column {
	width: 22.5vw;
	margin: 0.5em;
}

.option-tooltip > .tooltip-inner {
	max-width: 20vw;
}
.option-tooltip > .tooltip-inner > p {
	margin-top: 0.5em;
	margin-bottom: 0.5em;
}

.option-column .line {
	display: flex;
	align-items: center;
}

.option-column-title {
	margin: auto;
	padding: 0.25em;
	text-align: center;
	font-variant: all-small-caps;
}

.option-column .line > label {
	display: inline-block;
	width: 15rem;
	text-align: right;
}

.option-column .line .right {
	display: inline-block;
	width: 15rem;
}

.option-section {
	background-color: rgba(255, 255, 255, 0.05);
	border-radius: 0.25em;
	margin-bottom: 0.25em;
}

.option-info {
	width: 100%;
	text-align: center;
	font-size: 0.8em;
}

.welcome {
	font-size: 1.1rem;
	padding: 1.5em;
	padding-top: 0;
}

.welcome ul {
	list-style-type: none;
	padding-left: 1em;
	margin-right: 1em;
}

.welcome ul li {
	padding: 0.2em;
	padding-left: 0.5em;
}

.welcome ul li:nth-child(even) {
	background: rgba(0, 0, 0, 0.12);
}

.welcome ul li:nth-child(odd) {
	background: rgba(255, 255, 255, 0.03);
}

.welcome .important {
	font-size: 1.4rem;
}

.option-name {
	font-variant: small-caps;
}

label {
	margin: 0.25em;
}

.generic-container {
	position: relative;
}

.container {
	margin-top: 1em;
}

.disable-warning {
	position: absolute;
	top: 50%;
	left: 50%;
	z-index: 10;
	transform: translate(-50%, -50%);
	font-variant: small-caps;
	white-space: nowrap;
	font-size: 1em;
	text-shadow: 0px 0px 10px black;
}

#draft-in-progress {
	position: absolute;
	top: 50%;
	left: 50%;
	z-index: 10;
	white-space: nowrap;
	transform: translate(-50%, -50%);
	font-variant: small-caps;
	font-size: 1.5em;
	text-shadow: 0px 0px 10px black;
}

.draft-watching-state {
	text-align: center;
}

#main-vue button.stop {
	background-color: darkred;
}

.v-separator {
	border: 1px solid #666;
	width: 0;
	margin: 0.5em;
}

.main-controls {
	background-color: #333;
	padding: 0.25em;
	margin: 0.25em;
	border-radius: 0.25em;
}

.main-controls input[type="checkbox"] {
	margin-right: 0;
}

.main-controls fas {
	padding: 4px;
}

#limited-controls,
#view-controls {
	display: flex;
	justify-content: space-between;
	flex-wrap: wrap;
	align-items: baseline;
}

#session-id {
	width: 12em;
}

.small-number-input {
	width: 3em;
}

.session-players {
	background: #181818;
	padding: 0.5em;
	display: flex;
	justify-content: space-between;
	align-items: baseline;
}

ul.player-list {
	display: inline-block;
	list-style: none;
	margin: 0;
	flex-grow: 2;
	padding-left: 1.5em;
}

.player-list li {
	position: relative;
	display: inline-flex;
	justify-content: space-between;
	align-items: baseline;
	padding: 0.5em;
	min-width: 6em;
	margin-right: 1em;
	background: #282828;
	border-radius: 5px;
}

.player-list > li.draggable:hover {
	translate: 0 -3px;
	box-shadow: 3px 3px 5px 0 rgba(0, 0, 0, 0.75);
}

.player-name {
	max-width: 7.5em;
	overflow: hidden;
	white-space: nowrap;
	mask-image: linear-gradient(to right, rgba(0, 0, 0, 1) 6em, transparent);
}

.move-player {
	color: #555;
	/*font-size: 0.8em;*/
}

.move-player-left {
	position: absolute;
	left: -0.3em;
}

.move-player-right {
	position: absolute;
	right: -0.3em;
}

.draggable {
	cursor: grab;
}

.passing-order-left {
	position: absolute;
	left: -0.9em;
	top: 0.6em;
}

.passing-order-right {
	position: absolute;
	right: -0.97em;
	top: 0.6em;
}

.chat {
	display: inline-block;
	position: relative;
	white-space: nowrap;
}

.chat > * {
	display: inline-block;
}

.chat input {
	width: 14.5em;
}

.chat-bubble {
	pointer-events: none;
	position: absolute;
	left: calc(1em);
	top: calc(100% + 0.5em);
	background: #fff;
	color: black;
	border: solid 2px #000;
	padding: 0.25em;
	padding-left: 0.5em;
	padding-right: 0.5em;
	border-radius: 0.2em;
	opacity: 0;
	min-width: 100%;
	max-width: 50vw;
	max-height: 60vh;
	z-index: 2;

	transition: opacity 0.2s;
}

.chat-bubble:after {
	content: "";
	position: absolute;
	top: 0;
	left: 1em;
	width: 0;
	height: 0;
	border: 14px solid transparent;
	border-bottom-color: #fff;
	border-top: 0;
	border-left: 0;
	margin-left: -7px;
	margin-top: -14px;
}

.chat-history {
	position: absolute;
	top: calc(100% + 0.25em);
	right: 0;
	background: rgba(255, 255, 255, 0.5);
	padding: 0.5em;
	border-radius: 0.5em;
	color: black;
	max-width: 50vw;
	width: max-content;
	z-index: 1;
}

.chat-history:before {
	content: "";
	position: absolute;
	top: 0;
	right: calc(14px + 0.5em);
	width: 0;
	height: 0;
	border: 14px solid transparent;
	border-bottom-color: rgba(255, 255, 255, 0.5);
	border-top: 0;
	border-right: 0;
	margin-left: -7px;
	margin-top: -14px;
}

.chat-history ol {
	list-style: none;
	margin: 0;
	padding: 0;
	width: 100%;
	max-height: 60vh;
	overflow-y: scroll;
	white-space: initial;
}

.chat-history li {
	display: inline-flex;
	align-items: stretch;
	background: white;
	border-radius: 0.25em;
	width: calc(100% - 2 * 0.2em);
	margin: 0.2em;
}

.chat-history li span {
	padding: 0.25em;
}

.chat-history li .chat-author {
	border-radius: 0.25em 0 0 0.25em;
	background: #444;
	color: #ddd;
	font-weight: bold;
	word-wrap: anywhere;
}

.chat-history li .chat-message {
	border-radius: 0 0.25em 0.25em 0;
	background: white;
	flex-grow: 2;
	word-wrap: anywhere;
}

.status-icons {
	display: inline-flex;
}

.status-icons i {
	margin-left: 0.5em;
	font-size: 14px;
}

.pick-waiting {
	padding: 2em;
}

#chrono {
	padding: 0.2em;
	padding-left: 0.5em;
	padding-right: 0.5em;
}

.controls {
	display: flex;
	align-items: center;
}

.controls > * {
	margin: 0 !important;
	margin-right: 1.5em !important;
}

.controls h2 {
	display: inline-block;
	margin: 0;
	font-variant: small-caps;
	font-size: 28px;
}

.more-option {
	margin: 0.5em;
}

.more-option .fas {
	margin-left: 0.5em;
}

.card-placeholder {
	width: 200px;
	height: 283.333px;
	border-radius: 5px;
	background: url("./assets/img/cardback.png");
	background-repeat: no-repeat;
	background-size: 100%;
}

.card-placeholder .card-name {
	height: 20px;
	width: calc(100% - 5px);
	padding-top: 5px;
	padding-left: 5px;
	background-color: rgba(0, 0, 0, 0.25);
	-webkit-user-select: none;
	-moz-user-select: none;
	-ms-user-select: none;
	user-select: none;
}

.card-container {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	background-color: #282828;
	border-radius: 10px;
	box-shadow: inset 0 0 8px #383838;
}

.card {
	display: inline-block;
	position: relative;
	margin: 0.75em;
	text-align: center;
}

.card img {
	width: 200px;
	transition: transform 0.08s ease-out;
	/*transform-origin: bottom;*/
	border-radius: 6px;
	-webkit-user-select: none;
	-moz-user-select: none;
	-ms-user-select: none;
	user-select: none;
}

.card-count {
	position: absolute;
	right: 1em;
	bottom: 1em;
	background: rgba(0, 0, 0, 0.5);
	width: 1.5em;
	height: 1.5em;
	border-radius: 0.75em;
	line-height: 1.5em;
	text-align: center;
}

.burn-card,
.restore-card {
	position: absolute;
	left: 0;
	bottom: 0;
	text-shadow: 0 0 3px black, 0 0 4px white;
}

.not-booster {
	position: absolute;
	left: 1em;
	bottom: 1em;
	font-size: 0.5em;
	color: red;
	background-color: rgba(255, 255, 255, 0.8);
	padding: 0.2em;
	border-radius: 0.2em;
}

.booster .card img:hover,
.card-pool .card img:hover {
	transform: scale(1.08);
}

.selected {
	-webkit-box-shadow: 0px 0px 20px 1px rgba(0, 115, 2, 1);
	-moz-box-shadow: 0px 0px 20px 1px rgba(0, 115, 2, 1);
	box-shadow: 0px 0px 20px 1px rgba(0, 115, 2, 1);
}

.burned {
	-webkit-box-shadow: 0px 0px 20px 1px rgb(161, 0, 3);
	-moz-box-shadow: 0px 0px 20px 1px rgb(161, 0, 3);
	box-shadow: 0px 0px 20px 1px rgb(161, 0, 3);
}

.selected-high {
	-webkit-box-shadow: 0px 0px 20px 4px rgba(0, 200, 2, 1);
	-moz-box-shadow: 0px 0px 20px 4px rgba(0, 200, 2, 1);
	box-shadow: 0px 0px 20px 4px rgba(0, 200, 2, 1);
}

/* Deck display */

.empty-warning {
	position: absolute;
	top: 50%;
	left: 50%;
	translate: -50% -50%;
}

.card-pool {
	position: relative;
	min-height: 200px;
}

.card-columns {
	justify-content: flex-start;
	position: relative;
	padding: 0.75em;
	min-height: 283.33px;
}

.draggable-constrols {
	display: flex;
	flex-direction: column;
}

.minus-column,
.plus-column {
	margin: 0 0 0.2em 0;
	background-color: rgba(0, 0, 0, 0.1);
	border-radius: 37px;
	padding: 5px;
	width: 32px;
	height: 32px;
	text-align: center;
}

.cmc-column {
	display: flex;
	flex-direction: column;
	padding-bottom: 275px;
	margin-right: 0.75em;
}

.card-column > div,
.cmc-column > div {
	height: 25px;
	margin: 0;
	/*overflow: hidden*/
}

.card-column > div:hover,
.cmc-column > div:hover {
	z-index: 999;
	overflow: visible;
}

.card-column > div:last-child,
.cmc-column > div:last-child {
	overflow: visible;
}

/* No :hover outside of the div bounds */
.card-column > div > div,
.cmc-column > div > div {
	pointer-events: none;
}
/* Except if its fully visible */
.card-column > div:last-child > div,
.cmc-column > div:last-child > div {
	pointer-events: auto;
}

.drag-column {
	min-width: 200px;
	background-color: rgba(0, 0, 0, 0.1);
}

/* Close button */
.close {
	position: absolute;
	right: 32px;
	top: 32px;
	width: 32px;
	height: 32px;
	opacity: 0.5;
	transition: opacity 0.25s;
}
.close:hover {
	opacity: 1;
}
.close:before,
.close:after {
	position: absolute;
	left: 15px;
	content: " ";
	height: 33px;
	width: 4px;
	border-radius: 2px;
	background-color: #fff;
}
.close:before {
	transform: rotate(45deg);
}
.close:after {
	transform: rotate(-45deg);
}

.patch-notes {
	list-style-type: none;
}

/* ------------------------------------------------ */
/*             Absolute Center Spinner              */

.spinner {
	display: inline-block;
	width: 2em;
	height: 2em;
	margin-left: 1.5em;
}

.spinner:not(:required):after {
	--spinner-color: rgba(255, 255, 255, 0.75);
	content: "";
	display: inline-block;
	font-size: 8px;
	width: 1em;
	height: 1em;
	-webkit-animation: spinner 1500ms infinite linear;
	-moz-animation: spinner 1500ms infinite linear;
	-ms-animation: spinner 1500ms infinite linear;
	-o-animation: spinner 1500ms infinite linear;
	animation: spinner 1500ms infinite linear;
	border-radius: 0.5em;
	-webkit-box-shadow: var(--spinner-color) 1.5em 0 0 0, var(--spinner-color) 1.1em 1.1em 0 0,
		var(--spinner-color) 0 1.5em 0 0, var(--spinner-color) -1.1em 1.1em 0 0, rgba(0, 0, 0, 0.5) -1.5em 0 0 0,
		rgba(0, 0, 0, 0.5) -1.1em -1.1em 0 0, var(--spinner-color) 0 -1.5em 0 0, var(--spinner-color) 1.1em -1.1em 0 0;
	box-shadow: var(--spinner-color) 1.5em 0 0 0, var(--spinner-color) 1.1em 1.1em 0 0, var(--spinner-color) 0 1.5em 0 0,
		var(--spinner-color) -1.1em 1.1em 0 0, var(--spinner-color) -1.5em 0 0 0, var(--spinner-color) -1.1em -1.1em 0 0,
		var(--spinner-color) 0 -1.5em 0 0, var(--spinner-color) 1.1em -1.1em 0 0;
}

.loading {
	position: fixed;
	z-index: 999;
	height: 2em;
	width: 2em;
	overflow: visible;
	margin: auto;
	top: 0;
	left: 0;
	bottom: 0;
	right: 0;
}

/* Transparent Overlay */
.loading:before {
	content: "";
	display: block;
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background-color: rgba(0, 0, 0, 0.8);
}

.loading + span {
	position: absolute;
	top: calc(50% + 2em);
	right: 0;
	left: 0;
	z-index: 1000;
	text-align: center;
}

/* :not(:required) hides these rules from IE9 and below */
.loading:not(:required) {
	/* hide "loading..." text */
	font: 0/0 a;
	color: transparent;
	text-shadow: none;
	background-color: transparent;
	border: 0;
}

.loading:not(:required):after {
	--spinner-color: rgba(255, 255, 255, 0.75);
	content: "";
	display: block;
	font-size: 10px;
	width: 1em;
	height: 1em;
	margin-top: -0.5em;
	-webkit-animation: spinner 1500ms infinite linear;
	-moz-animation: spinner 1500ms infinite linear;
	-ms-animation: spinner 1500ms infinite linear;
	-o-animation: spinner 1500ms infinite linear;
	animation: spinner 1500ms infinite linear;
	border-radius: 0.5em;
	-webkit-box-shadow: var(--spinner-color) 1.5em 0 0 0, var(--spinner-color) 1.1em 1.1em 0 0,
		var(--spinner-color) 0 1.5em 0 0, var(--spinner-color) -1.1em 1.1em 0 0, rgba(0, 0, 0, 0.5) -1.5em 0 0 0,
		rgba(0, 0, 0, 0.5) -1.1em -1.1em 0 0, var(--spinner-color) 0 -1.5em 0 0, var(--spinner-color) 1.1em -1.1em 0 0;
	box-shadow: var(--spinner-color) 1.5em 0 0 0, var(--spinner-color) 1.1em 1.1em 0 0, var(--spinner-color) 0 1.5em 0 0,
		var(--spinner-color) -1.1em 1.1em 0 0, var(--spinner-color) -1.5em 0 0 0, var(--spinner-color) -1.1em -1.1em 0 0,
		var(--spinner-color) 0 -1.5em 0 0, var(--spinner-color) 1.1em -1.1em 0 0;
}

/* Animation */

@-webkit-keyframes spinner {
	0% {
		-webkit-transform: rotate(0deg);
		-moz-transform: rotate(0deg);
		-ms-transform: rotate(0deg);
		-o-transform: rotate(0deg);
		transform: rotate(0deg);
	}
	100% {
		-webkit-transform: rotate(360deg);
		-moz-transform: rotate(360deg);
		-ms-transform: rotate(360deg);
		-o-transform: rotate(360deg);
		transform: rotate(360deg);
	}
}
@-moz-keyframes spinner {
	0% {
		-webkit-transform: rotate(0deg);
		-moz-transform: rotate(0deg);
		-ms-transform: rotate(0deg);
		-o-transform: rotate(0deg);
		transform: rotate(0deg);
	}
	100% {
		-webkit-transform: rotate(360deg);
		-moz-transform: rotate(360deg);
		-ms-transform: rotate(360deg);
		-o-transform: rotate(360deg);
		transform: rotate(360deg);
	}
}
@-o-keyframes spinner {
	0% {
		-webkit-transform: rotate(0deg);
		-moz-transform: rotate(0deg);
		-ms-transform: rotate(0deg);
		-o-transform: rotate(0deg);
		transform: rotate(0deg);
	}
	100% {
		-webkit-transform: rotate(360deg);
		-moz-transform: rotate(360deg);
		-ms-transform: rotate(360deg);
		-o-transform: rotate(360deg);
		transform: rotate(360deg);
	}
}
@keyframes spinner {
	0% {
		-webkit-transform: rotate(0deg);
		-moz-transform: rotate(0deg);
		-ms-transform: rotate(0deg);
		-o-transform: rotate(0deg);
		transform: rotate(0deg);
	}
	100% {
		-webkit-transform: rotate(360deg);
		-moz-transform: rotate(360deg);
		-ms-transform: rotate(360deg);
		-o-transform: rotate(360deg);
		transform: rotate(360deg);
	}
}

/* Collection stats */
.set-stats {
	margin: 0.5em;
}

.set-stats table {
	margin: auto;
}

.set-stats caption {
	font-size: 1.25em;
}

.set-stats tr:nth-child(odd) {
	background-color: rgba(0, 0, 0, 0.2);
}

.set-stats th,
.set-stats td {
	padding: 0.25em;
}

.set-stats td:not(:first-child) {
	text-align: center;
}

/* Animations */

.shaking {
	animation: shake 0.82s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
	transform: translate3d(0, 0, 0);
	backface-visibility: hidden;
	perspective: 1000px;
}

@keyframes shake {
	10%,
	90% {
		transform: translate3d(-1px, 0, 0);
	}

	20%,
	80% {
		transform: translate3d(2px, 0, 0);
	}

	30%,
	50%,
	70% {
		transform: translate3d(-4px, 0, 0);
	}

	40%,
	60% {
		transform: translate3d(4px, 0, 0);
	}
}

.pulsing {
	animation: pulse 0.4s;
	box-shadow: 0 0 0 0 rgba(200, 0, 0, 1);
	transform: scale(1);
}

@keyframes pulse {
	0% {
		transform: scale(1.1);
		box-shadow: 0 0 0 0 rgba(200, 0, 0, 0.7);
	}

	70% {
		transform: scale(1);
		box-shadow: 0 0 0 10px rgba(200, 0, 0, 0);
	}

	100% {
		transform: scale(1);
		box-shadow: 0 0 0 0 rgba(200, 0, 0, 0);
	}
}

#main-vue button.confirm {
	background-color: #3085d6;
	text-shadow: 0 0 2px black;
}
#main-vue button.confirm:hover {
	background-color: #2972b6;
}

#main-vue button.cancel {
	background-color: #d33;
	text-shadow: 0 0 2px black;
}

#main-vue button.cancel:hover {
	background-color: #c22;
}

pre {
	background-color: #333;
	padding: 0.5em;
}
</style>
