<template>
	<modal v-if="displayDraftLog && draftLog" @close="displayDraftLog = false">
		<h2 slot="header">
			Draft Log
			<span v-if="draftLog.sessionID">for Session '{{ draftLog.sessionID }}'</span>
			<span v-if="draftLog.time">({{ new Date(draftLog.time).toLocaleString() }})</span>
			<button type="button" @click="downloadLog">Download full log</button>
		</h2>
		<div slot="body">
			<p>Click on a player to display the details of their draft.</p>

			<div>
				<ul
					:class="{
						'player-table': extendedDraftLog.length <= 8,
						'player-list': extendedDraftLog.length > 8,
					}"
				>
					<li
						v-for="log of extendedDraftLog"
						:class="{
							clickable: log.userName != '(empty)',
							selected: log.userID == draftLogDisplayOptions.detailsUserID,
						}"
						@click="
							_ => {
								if (log.userName != '(empty)') {
									draftLogDisplayOptions.detailsUserID = log.userID;
								}
							}
						"
					>
						{{ log.userName }}
						<span>
							<img
								src="img/mana/W.svg"
								class="mana-icon"
								v-if="log.colors['W'] >= 10"
								v-tooltip="log.colors['W']"
							/>
							<img
								src="img/mana/U.svg"
								class="mana-icon"
								v-if="log.colors['U'] >= 10"
								v-tooltip="log.colors['U']"
							/>
							<img
								src="img/mana/B.svg"
								class="mana-icon"
								v-if="log.colors['B'] >= 10"
								v-tooltip="log.colors['B']"
							/>
							<img
								src="img/mana/R.svg"
								class="mana-icon"
								v-if="log.colors['R'] >= 10"
								v-tooltip="log.colors['R']"
							/>
							<img
								src="img/mana/G.svg"
								class="mana-icon"
								v-if="log.colors['G'] >= 10"
								v-tooltip="log.colors['G']"
							/>
						</span>
					</li>
				</ul>
			</div>

			<div
				v-if="Object.keys(draftLog.users).includes(draftLogDisplayOptions.detailsUserID)"
				:set="(log = draftLog.users[draftLogDisplayOptions.detailsUserID])"
			>
				<h2>{{ log.userName }}</h2>
				<select v-model="draftLogDisplayOptions.category">
					<option>Picks</option>
					<option>Cards</option>
					<option></option>
					<option>Cards (CMC Columns)</option>
					<option></option>
				</select>

				<button @click="exportSingleLog(log.userID)">Export in MTGA format</button>
				<button @click="downloadMPT(log.userID)">Download in MTGO format</button>
				<button @click="submitToMPT(log.userID)">Submit to MagicProTools</button>

				<template v-if="draftLogDisplayOptions.category == 'Picks'">
					<div v-for="(pick, index) in log.picks">
						<h3>Pick {{ index + 1 }}: {{ cards[pick.pick].name }}</h3>
						<draft-log-pick :pick="pick"></draft-log-pick>
					</div>
				</template>
				<template v-else-if="draftLogDisplayOptions.category == 'Cards (CMC Columns)'">
					<div class="card-container card-columns">
						<div v-for="cmc_column in idColumnCMC(log.cards)" class="cmc-column">
							<figure
								is="card"
								v-for="(card, index) in cmc_column"
								v-bind:key="index"
								v-bind:card="cards[card]"
								v-bind:language="language"
							></figure>
						</div>
					</div>
				</template>
				<template v-else>
					<input type="checkbox" name="draft-log-card-list" v-model="draftLogDisplayOptions.textList" />
					<label for="draft-log-card-list">Show simple card list</label>
					<template v-if="draftLogDisplayOptions.textList">
						<ol class="draft-log-boosters-list">
							<li v-for="card in log.cards">{{ cards[card].printed_name[language] }}</li>
						</ol>
					</template>
					<template v-else>
						<div class="card-container">
							<figure
								is="card"
								v-for="(card, index) in log.cards"
								v-bind:key="index"
								v-bind:card="cards[card]"
								v-bind:language="language"
							></figure>
						</div>
					</template>
				</template>
			</div>
		</div>
	</modal>
</template>

<style scoped>
.draft-log-boosters-list {
	column-count: 3;
	column-gap: 1em;
}

ul.player-table {
	display: flex;
	flex-wrap: wrap;
	list-style: none;
	--margin: 1.5em;
}

ul.player-table li {
	width: calc(24% - 2 * var(--margin) - 1em);
	max-width: calc(24% - 2 * var(--margin) - 1em);
	border: 1px solid black;
	margin: var(--margin);
	position: relative;
	padding: 0.5em;
	border-radius: 0.2em;
}

.bot {
	min-width: auto !important;
}

ul.player-table li:nth-child(1) {
	order: 1;
}
ul.player-table li:nth-child(2) {
	order: 2;
}
ul.player-table li:nth-child(3) {
	order: 3;
}
ul.player-table li:nth-child(4) {
	order: 4;
}
ul.player-table li:nth-child(5) {
	order: 8;
}
ul.player-table li:nth-child(6) {
	order: 7;
}
ul.player-table li:nth-child(7) {
	order: 6;
}
ul.player-table li:nth-child(8) {
	order: 5;
}

ul.player-table li:nth-child(1):after,
ul.player-table li:nth-child(2):after,
ul.player-table li:nth-child(3):after {
	content: "";
	height: 1px;
	background: black;
	width: calc(2 * var(--margin));
	position: absolute;
	right: calc(-2 * var(--margin));
	top: 50%;
}

ul.player-table li:nth-child(1):before,
ul.player-table li:nth-child(2):before,
ul.player-table li:nth-child(3):before {
	content: "";
	position: absolute;
	width: 0;
	height: 0;
	top: 50%;
	border-style: solid;
	border-width: 7px 0 7px 20px;
	border-color: transparent transparent transparent black;
	right: -20px;
	transform: translateY(-50%) rotate(180deg);
}

ul.player-table li:nth-child(5):after,
ul.player-table li:nth-child(6):after,
ul.player-table li:nth-child(7):after {
	content: "";
	height: 1px;
	background: black;
	width: calc(2 * var(--margin));
	position: absolute;
	left: calc(-2 * var(--margin));
	top: 50%;
}

ul.player-table li:nth-child(5):before,
ul.player-table li:nth-child(6):before,
ul.player-table li:nth-child(7):before {
	content: "";
	position: absolute;
	width: 0;
	height: 0;
	top: 50%;
	border-style: solid;
	border-width: 7px 0 7px 20px;
	border-color: transparent transparent transparent black;
	left: -20px;
	transform: translateY(-50%);
}

ul.player-table li:nth-child(8):before {
	content: "";
	position: absolute;
	width: 0;
	height: 0;
	left: 50%;
	border-style: solid;
	border-width: 7px 0 7px 20px;
	border-color: transparent transparent transparent black;
	top: -20px;
	transform: translateX(-50%) rotate(90deg);
}

ul.player-table li:nth-child(8):after {
	content: "";
	width: 1px;
	background: black;
	height: calc(2 * var(--margin));
	position: absolute;
	top: calc(-2 * var(--margin));
	left: 50%;
}

ul.player-table li:nth-child(4):before {
	content: "";
	position: absolute;
	width: 0;
	height: 0;
	left: 50%;
	border-style: solid;
	border-width: 7px 0 7px 20px;
	border-color: transparent transparent transparent black;
	bottom: -20px;
	transform: translateX(-50%) rotate(-90deg);
}

ul.player-table li:nth-child(4):after {
	content: "";
	width: 1px;
	background: black;
	height: calc(2 * var(--margin));
	position: absolute;
	bottom: calc(-2 * var(--margin));
	left: 50%;
}
</style>
