<template>
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
						<caption>
							{{
								collectionStats[set].fullName
							}}
						</caption>
						<tr>
							<th>Rarity</th>
							<th>Unique</th>
							<th>Total</th>
							<th>Total Missing</th>
							<th>Unique (Booster)</th>
							<th>Missing From Boosters</th>
						</tr>
						<tr>
							<td>Total</td>
							<td>
								{{ collectionStats[set].cards.filter(c => c.count > 0).length }}/{{
									collectionStats[set].total.unique
								}}
							</td>
							<td>
								{{ collectionStats[set].cardCount }}/{{ 4 * collectionStats[set]["total"]["unique"] }}
							</td>
							<td>{{ 4 * collectionStats[set]["total"]["unique"] - collectionStats[set].cardCount }}</td>
							<td>
								{{ collectionStats[set].cards.filter(c => c.in_booster && c.count > 0).length }}/{{
									collectionStats[set].cards.filter(c => c.in_booster).length
								}}
							</td>
							<td>-</td>
						</tr>
						<tr
							v-for="r in ['common', 'uncommon', 'rare', 'mythic']"
							v-if="collectionStats[set][r + 'Count'] && collectionStats[set]['total'][r + 'Count'] > 0"
						>
							<td>{{ r }}</td>
							<td>
								{{ collectionStats[set][r].filter(c => c.count > 0).length }}/{{
									collectionStats[set]["total"][r + "Count"]
								}}
							</td>
							<td>
								{{ collectionStats[set][r + "Count"] }}/{{
									4 * collectionStats[set]["total"][r + "Count"]
								}}
							</td>
							<td>
								{{ 4 * collectionStats[set]["total"][r + "Count"] - collectionStats[set][r + "Count"] }}
							</td>
							<td>
								{{ collectionStats[set][r].filter(c => c.in_booster && c.count > 0).length }}/{{
									collectionStats[set][r].filter(c => c.in_booster).length
								}}
							</td>
							<td>
								{{
									4 * collectionStats[set][r].filter(c => c.in_booster).length -
										collectionStats[set][r]
											.filter(c => c.in_booster)
											.reduce((acc, val) => acc + val.count, 0)
								}}
							</td>
						</tr>
					</table>

					<h3>
						Missing
						<select v-model="statsMissingRarity"
							><option value="common">Commons</option
							><option value="uncommon">Uncommons</option
							><option value="rare">Rares</option
							><option value="mythic">Mythics</option></select
						>
						<input type="checkbox" id="show-non-booster" v-model="statsShowNonBooster" /><label
							for="show-non-booster"
							>Show non-booster cards</label
						>
					</h3>
					<div class="card-container">
						<figure
							is="missingCard"
							v-for="(card, index) in collectionStats[set].cards.filter(
								c =>
									c.rarity == statsMissingRarity &&
									(statsShowNonBooster || c.in_booster) &&
									c.count < 4
							)"
							v-bind:key="card.uniqueID"
							v-bind:card="card"
							v-bind:language="language"
						></figure>
					</div>
				</div>
			</div>
		</div>
	</modal>
</template>
