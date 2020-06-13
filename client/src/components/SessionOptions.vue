<template>
	<modal @close="$root.modal = ''">
		<h2 slot="header">Additional Session Options</h2>
		<div
			slot="body"
			class="session-options-container"
			:class="{ disabled: $root.userID != $root.sessionOwner }"
		>
			<div class="option-column">
				<div
					class="line"
					v-tooltip.left="{
						classes: 'option-tooltip',
						content: '<p>Share this session ID with everyone.</p>',
					}"
				>
					<label for="is-public">Public</label>
					<div class="right">
						<input type="checkbox" v-model="$root.isPublic" id="is-public" />
					</div>
				</div>
				<div
					class="line"
					v-tooltip.left="{
						classes: 'option-tooltip',
						content: '<p>Is the session owner participating in?</p>',
					}"
				>
					<label for="is-owner-player">Session owner is playing</label>
					<div class="right">
						<input type="checkbox" v-model="$root.ownerIsPlayer" id="is-owner-player" />
					</div>
				</div>
				<div class="line">
					<label for="max-players">Maximum Players</label>
					<div class="right">
						<input
							class="small-number-input"
							type="number"
							id="max-players"
							min="1"
							max="16"
							step="1"
							v-model.number="$root.maxPlayers"
						/>
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
				<div
					class="line"
					v-tooltip.left="{
						classes: 'option-tooltip',
						content:
							'<p>If set, the system will attempt to smooth out the color distribution in each pack, as opposed to being completely random.</p>',
					}"
				>
					<label for="color-balance">Color Balance</label>
					<div class="right">
						<input type="checkbox" v-model="$root.colorBalance" id="color-balance" />
					</div>
				</div>
				<div
					class="line"
					v-bind:class="{ disabled: $root.useCustomCardList }"
					v-tooltip.left="{
						classes: 'option-tooltip',
						content:
							'<p>If enabled (default) Rares can be promoted to a Mythic at a 1/8 rate.</p><p>Disabled for Custom Card Lists.</p>',
					}"
				>
					<label for="mythic-promotion">Rare promotion to Mythic</label>
					<div class="right">
						<input type="checkbox" v-model="$root.mythicPromotion" id="mythic-promotion" />
					</div>
				</div>
				<div
					class="option-section"
					v-bind:class="{ disabled: $root.useCustomCardList }"
					v-tooltip.left="{
						classes: 'option-tooltip',
						content:
							'<p>Lets you customize the exact content of your boosters.</p><p>Notes:<ul><li>Zero is a valid value (useful for Pauper or Artisan for example).</li><li>A land slot will be automatically added for some sets.</li><li>Unused when drawing from a custom card list: See the advanced card list syntax to mimic it.</li></ul></p>',
					}"
				>
					<div class="option-column-title">Booster Content</div>
					<div class="line" v-for="r in ['common', 'uncommon', 'rare']" :key="r">
						<label :for="'booster-content-' + r" class="capitalized">{{ r }}s</label>
						<div class="right">
							<!--
							<input
								class="small-number-input"
								type="number"
								:id="'booster-content-' + r"
								min="0"
								max="16"
								step="1"
								v-model.number="$root.boosterContent[r]"
							/>-->
						</div>
					</div>
				</div>
				<div
					class="option-section"
					v-bind:class="{ disabled: $root.useCustomCardList }"
					v-tooltip.left="{
						classes: 'option-tooltip',
						content:
							'<p>Sets a duplicate limit for each rarity across the entire draft. Only used if no player collection is used to limit the card pool. Default values attempt to mimic a real booster box.</p>',
					}"
				>
					<div class="option-column-title">Max. duplicate copies</div>
					<div class="line" v-for="r in ['common', 'uncommon', 'rare', 'mythic']" :key="r">
						<label :for="'max-duplicates-' + r" class="capitalized">{{ r }}s</label>
						<div class="right">
							<input
								class="small-number-input"
								type="number"
								:id="'max-duplicates-' + r"
								min="1"
								max="16"
								step="1"
								v-model.number="$root.maxDuplicates[r]"
							/>
						</div>
					</div>
				</div>
				<div
					class="line"
					v-bind:class="{ disabled: $root.useCustomCardList }"
					v-tooltip.left="{
						classes: 'option-tooltip',
						content:
							'<p>If enabled, each pack will have a chance to contain a \'foil\' card of any rarity in place of one common.</p>',
					}"
				>
					<label for="option-foil">Foil</label>
					<div class="right">
						<input type="checkbox" v-model="$root.foil" id="option-foil" />
					</div>
				</div>
				<div
					class="line"
					v-tooltip.left="{ classes: 'option-tooltip', content: '<p>Use a custom card list (aka Cube).</p>' }"
				>
					<label for="use-custom-card-list">Use a Custom Card List</label>
					<div class="right">
						<input type="checkbox" v-model="$root.useCustomCardList" id="use-custom-card-list" />
					</div>
				</div>
				<div v-bind:class="{ disabled: !$root.useCustomCardList }" class="line">
					<label for="card-list-input">Custom Card List</label>
					<div class="right">
						<input
							type="file"
							id="card-list-input"
							@change="parseCustomCardList"
							style="display:none"
							accept=".txt"
						/>
						<button
							onclick="document.querySelector('#card-list-input').click()"
							v-tooltip="'Import your custom card list.'"
						>
							Upload
							<i
								v-if="$root.customCardList.length > 0"
								class="fas fa-check green"
								v-tooltip="'Card list uploaded.'"
							></i>
						</button>
						<span v-if="$root.customCardList.length > 0">{{ $root.customCardList.length }} cards in list.</span>
					</div>
				</div>
				<div class="option-info">
					Use services like
					<a href="https://www.cubetutor.com/" target="_blank">Cube Tutor</a>
					or
					<a href="https://cubecobra.com/" target="_blank">Cube Cobra</a>
					to craft your list, export it to .txt then upload it here.
					<a
						href="cubeformat.html"
						target="_blank"
					>Click Here for more information.</a>
				</div>
			</div>
			<div class="option-column">
				<h4>Draft Specific Options</h4>
				<div
					class="line"
					v-tooltip.right="{
						classes: 'option-tooltip',
						content: '<p>Draft: Boosters per Player; default is 3.</p>',
					}"
				>
					<label for="boosters-per-player">Boosters per Player</label>
					<div class="right">
						<input
							type="number"
							id="boosters-per-player"
							class="small-number-input"
							min="1"
							max="25"
							step="1"
							v-model.number="$root.boostersPerPlayer"
						/>
					</div>
				</div>
				<div class="option-section" v-bind:class="{ disabled: $root.useCustomCardList }">
					<div class="option-column-title">Individual Booster Set</div>
					<div
						class="line"
						v-tooltip.right="{classes: 'option-tooltip', content: '<p>Controls how the boosters will be distributed.</p><ul><li>Regular: Each player will receive boosters from the same sets and will open them in the same order.</li><li>Shuffle Player Boosters: Each players will receive boosters from the same sets but will open them in a random order.</li><li>Shuffle Booster Pool: Boosters will be randomly handed to each player.</li></ul>'}"
					>
						<label for="distribution-mode">Distribution Mode</label>
						<select
							class="right"
							v-model="$root.distributionMode"
							name="distributionMode"
							id="distribution-mode"
						>
							<option value="regular">Regular</option>
							<option value="shufflePlayerBoosters">Shuffle Player Boosters</option>
							<option value="shuffleBoosterPool">Shuffle Booster Pool</option>
						</select>
					</div>
					<div
						v-tooltip.right="{classes: 'option-tooltip', content: '<p>Specify the set of each booster individually. Useful for classic Chaos Draft for example.</p><p>Note: Collections are ignored for each booster with any other value than (Default).</p>'}"
					>
						<div v-for="(value, index) in customBoosters" :key="index" class="line">
							<label for="customized-booster">Booster #{{index+1}}</label>
							<select class="right" v-model="$root.customBoosters[index]">
								<option value>(Default)</option>
								<option v-for="code in $root.sets" :key="code" :value="code">{{setsInfos[code].fullName}}</option>
							</select>
						</div>
					</div>
				</div>
				<div
					class="line"
					v-tooltip.right="{
						classes: 'option-tooltip',
						content:
							'<p>In addition to picking a card each round, you will also remove this number of cards from the draft.</p><p>This is typically used in conjunction with a higher count of boosters per player for drafting with 2 to 4 players. Burn or Glimpse Draft is generally 9 boosters per players and 2 burned cards per round.</p><p>Default is 0.</p>',
					}"
				>
					<label for="burned-cards-per-round">Burned cards per round</label>
					<div class="right">
						<input
							type="number"
							id="burned-cards-per-round"
							class="small-number-input"
							min="0"
							max="24"
							step="1"
							v-model.number="$root.burnedCardsPerRound"
						/>
					</div>
				</div>
				<div
					class="line"
					v-tooltip.right="{
						classes: 'option-tooltip',
						content:
							'<p>Controls who is going to receive the draft logs.</p><p>\'Owner only, delayed\': Owner will choose when to reveal the draft log. Useful for tournaments.</p>',
					}"
				>
					<label for="draft-log-recipients">Send draft logs to</label>
					<div class="right">
						<select v-model="$root.draftLogRecipients" id="draft-log-recipients">
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
</template>

<script>
import { mapState } from "vuex";
import { SwalCustomClasses } from "../constants.js";
import Swal from "sweetalert2";
import modal from "./Modal.vue";

export default {
	methods: {
		parseCustomCardList: function(e) {
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
			reader.onload = e => {
				let contents = e.target.result;

				const parseLine = line => {
					line = line.trim();
					let [, /*fullMatch*/ count, name, set, number] = line.match(
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
					let cardID = Object.keys(this.cards).find(
						id =>
							this.cards[id].name == name &&
							(!set || this.cards[id].set === set) &&
							(!number || this.cards[id].collector_number === number)
					);
					if (typeof cardID !== "undefined") {
						return [count, cardID];
					} else {
						// If not found, try doubled faced cards before giving up!
						cardID = Object.keys(this.cards).find(
							id =>
								this.cards[id].name.startsWith(name + " //") &&
								(!set || this.cards[id].set === set) &&
								(!number || this.cards[id].collector_number === number)
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
						this.customCardList = cardList;
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
						this.customCardList = cardList;
					}
					this.socket.emit("customCardList", this.customCardList, answer => {
						if (answer.code === 0) {
							this.fireToast("success", `Card list uploaded (${this.customCardList.length} cards)`);
						} else {
							this.fireToast("error", `Error while uploading card list: ${answer.error}`);
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
	},
};
</script>
