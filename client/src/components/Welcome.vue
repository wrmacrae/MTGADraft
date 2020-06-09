<template>
	<div class="welcome">
		<h1>Welcome to MTGADraft!</h1>
		<p class="important">
			Want to draft in MTGA with your friends? Noticed you currently can't do that natively? We're here for you!
		</p>
		<ol class="important">
			<li>
				(Optional) Import your collection: Enable Detailed logs in game, the toggle can be found in Options >
				View Account > Detailed Logs (Plugin Support), importing your collection won't work without this
				activated.
				<a onclick="document.querySelector('#file-input').click()">Upload your MTGA logs</a> (you should find
				them at <tt>C:\Users\%username%\AppData\LocalLow\Wizards Of The Coast\MTGA\Player.log</tt>, note that
				<a href="https://support.microsoft.com/en-us/help/14201/windows-show-hidden-files" target="_blank"
					>AppData is hidden by default</a
				>) to restrict the draft to the cards you actually own in the game.
			</li>
			<li>Use the controls on top of the page to enter your User Name and indicate your preferences.</li>
			<li>
				Share your session ID with your friends (or join their own session) and wait for your session owner to
				start a draft!
			</li>
		</ol>
		<h2>Options</h2>
		<div style="display: flex">
			<div style="width: 50%">
				<strong>Session options</strong>
				(Only accessible to the session owner, shared by everyone in your session)
				<ul>
					<li>
						<span class="option-name">Ignore Collections</span>: Draft with all cards of the selected
						set(s), ignoring player collections and preferences.
					</li>
					<li>
						<span class="option-name">Set(s)</span>: Select one or multiple sets to draft using only with
						cards from these sets.
					</li>
					<li>
						<span class="option-name">Bots</span>: Adds virtual players to your draft. They are
						<strong>pretty dumb</strong>, but they are doing their best :(
					</li>
					<li>
						<span class="option-name">Pick Timer</span>: Maximum time in seconds allowed to pick a card in
						each booster. 0 means the timer is disabled.
					</li>
				</ul>
				Click on
				<span @click="showSessionOptionsDialog = !showSessionOptionsDialog" class="clickable"
					>More <i class="fa-bars fa"></i
				></span>
				for some additional options:
				<ul>
					<li>
						<span class="option-name">Public</span>: Flags your session as public. It will appear in the
						"Public Sessions" menu so anyone can directly join.
					</li>
					<li>
						<span class="option-name">Color Balance</span>: If set, the system will attempt to smooth out
						the color distribution in each pack, as opposed to being completely random. (Also affects sealed
						and cube)
					</li>
					<li>
						<span class="option-name">Custom card list</span>: Submit a custom card list (one English card
						name by line) to draft your own cube. (Collections are ignored in this mode)
						<a href="cubeformat.html" target="_blank">More information here</a>
					</li>
					<li>
						<span class="option-name">Foil</span>: If enabled, each pack will have a chance to contain a
						'foil' card of any rarity in place of one common.
					</li>
				</ul>
			</div>
			<div style="width: 50%">
				<strong>Personal options</strong>
				<ul>
					<li>
						<span class="option-name">Language</span>: Adjusts the display language of cards. (Only affects
						cards)
					</li>
					<li>
						<span class="option-name">Restrict to Collection</span>: If unchecked, your collection will not
						limit the cards available in the selected sets. If every players unchecks this, you will draft
						using every cards. (Ignored if "Ignore Collections" is enabled in the session, or when using a
						Custom Card List)
					</li>
					<li>
						<span class="option-name">Pick on Double Click</span>: Allows you to double click on booster
						cards during draft to pick without having to confirm.
					</li>
					<li>
						<span class="option-name">Notifications</span>: If enabled, you will be notified when a draft is
						launched.
					</li>
					<li>
						<span class="option-name">Session ID</span>: A unique identifier for your session, you can use
						any name, just make sure to use the same as your friends to play with them!
					</li>
					<li>
						<span class="option-name">Card Display</span>: Adjusts the order of cards within a sealed pool
						or your drafted cards.
					</li>
				</ul>
			</div>
		</div>
	</div>
</template>
