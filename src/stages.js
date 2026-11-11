/* Stage bible, comics, and seed phrase. */
(function (global) {
  const WORDS = [
    'NOT','YOUR','KEYS','NOT','YOUR','COINS','NEVER','TYPE','THE','PHRASE',
    'ON','A','WEBSITE','VERIFY','TWICE','GAS','FEES','STING','RUGS','PULL',
    'HARDER','HOLD','THROUGH','FUD','CHAOS'
  ];

  const BOSSES = [
    // id matches portrait filename stem
    { id: 'hockey_mask', name: 'HOCKEY MASK' },
    { id: 'cowboy', name: 'COWBOY' },
    { id: 'gladiator', name: 'GLADIATOR' },
    { id: 'hunter', name: 'HUNTER' },
    { id: 'fire', name: 'FIRE' },
    { id: 'chief', name: 'CHIEF' },
    { id: 'medusa', name: 'MEDUSA' },
    { id: 'gold_mage', name: 'GOLD MAGE' },
    { id: 'steampunk', name: 'STEAMPUNK' },
    { id: 'sheikh', name: 'SHEIKH' },
    { id: 'ice', name: 'ICE' },
    { id: 'blue', name: 'BLUE' },
    { id: 'mask', name: 'MASK' },
    { id: 'quarterback', name: 'QUARTERBACK' },
    { id: 'digital_punk', name: 'DIGITAL PUNK' },
    { id: 'manga', name: 'MANGA' },
    { id: 'poison', name: 'POISON' },
    { id: 'bloodbath', name: 'BLOODBATH' },
    { id: 'arachnia', name: 'ARACHNIA' },
    { id: 'optimus', name: 'OPTIMUS' },
    { id: 'assimilator', name: 'ASSIMILATOR' },
    { id: 'neural', name: 'NEURAL' },
    { id: 'elemental', name: 'ELEMENTAL' },
    { id: 'alien', name: 'ALIEN' },
    { id: 'chaos', name: 'CHAOS ECHO' },
  ];

  const META = [
    { era: "Camp Crystal '87", year: '1987', place: 'Misty summer-camp woods', bg: 'woods', enemy: 'woods', civ: 'woods', music: 'woods', palette: ['#071018','#1c3a55','#6fa0c4'], status: 'polished', kit: 'woods', motion: null },
    { era: 'Deadwood Gulch', year: '1884', place: 'A train heist and horseback chase at sundown', bg: 'west', enemy: 'west', civ: 'west', music: 'west', palette: ['#2a1408','#c45a18','#f0c27a'], status: 'polished', kit: 'west', motion: { kind: 'west_ride', speed: 220, label: 'Train heist / horseback' } },
    { era: 'The Flavian Arena', year: '80 AD', place: 'The sand of the colosseum', bg: 'rome', enemy: 'rome', civ: 'rome', music: 'rome', palette: ['#3a2414','#c2342a','#e8c888'], status: 'polished', kit: 'ancient', motion: null },
    { era: 'Bone Valley', year: '12,000 BC', place: 'A prehistoric hunting ground', bg: '04_bone', enemy: 'prehistoric', civ: 'prehistoric', music: 'woods', palette: ['#2a2010','#6b8f3a','#d8c070'], status: 'hd plate', kit: 'prehistoric', motion: null },
    { era: 'Valley of the Keys', year: '1324 BC', place: 'A Nile barge under the tombs', bg: '05_egypt', enemy: 'egypt', civ: 'egypt', music: 'egypt', palette: ['#2a1a08','#d4a017','#efe0a0'], status: 'hd plate', kit: 'egypt', motion: { kind: 'barge', speed: 140, label: 'Nile barge chase' } },
    { era: 'The Shield Wall', year: '480 BC', place: 'A bronze-lit spartan pass', bg: '06_sparta', enemy: 'sparta', civ: 'sparta', music: 'rome', palette: ['#1a1c14','#7a8a3a','#c8d0a0'], status: 'hd plate', kit: 'sparta', motion: null },
    { era: "Medusa's Atrium", year: 'Mythic', place: 'A temple of living stone', bg: '07_medusa', enemy: 'temple', civ: 'temple', music: 'boss', palette: ['#102018','#2f8a5a','#c0ffd0'], status: 'hd plate', kit: 'temple', motion: null },
    { era: 'The Gilded Keep', year: '1422', place: 'A flying airship over the citadel', bg: '08_keep', enemy: 'medieval', civ: 'medieval', music: 'rome', palette: ['#1a1208','#c8a020','#ffe9a0'], status: 'hd plate', kit: 'medieval', motion: { kind: 'airship', speed: 160, label: 'Flying airship' } },
    { era: 'Brassborough', year: '1891', place: 'A steampunk train through clockwork London', bg: '09_brass', enemy: 'industrial', civ: 'industrial', music: 'industrial', palette: ['#16120e','#8a5a28','#d8c8a0'], status: 'hd plate', kit: 'industrial', motion: { kind: 'steamtrain', speed: 260, label: 'Steampunk train' } },
    { era: 'The Pearl Yacht', year: '1977', place: 'A superyacht escape off the palace harbor', bg: '10_yacht', enemy: 'yacht_guard', civ: 'yacht_crew', music: 'yacht', palette: ['#201808','#d4b060','#fff0c8'], status: 'hd plate', kit: 'yacht', motion: { kind: 'yacht', speed: 200, label: 'Yacht escape' } },
    { era: 'The Still Glacier', year: 'Ice Age+', place: 'A cathedral of blue ice', bg: '11_glacier', enemy: 'prehistoric', civ: 'prehistoric', music: 'ice', palette: ['#061018','#3aa0d0','#d0f0ff'], status: 'hd plate', kit: 'prehistoric', motion: null },
    { era: 'The Jade Canopy', year: 'Timeless', place: 'A deep tribal jungle', bg: '12_jungle', enemy: 'prehistoric', civ: 'prehistoric', music: 'woods', palette: ['#07140c','#1e7a38','#b8e080'], status: 'hd plate', kit: 'prehistoric', motion: null },
    { era: 'The Riviera Floor', year: '1929', place: 'A Riviera casino hall — tables, chandeliers, flying chips', bg: '13_casino', enemy: 'mobster', civ: 'tuxedo', music: 'casino', palette: ['#14080c','#8a2030','#e0c080'], status: 'hd plate', kit: 'highroller', motion: null },
    { era: 'Fourth and Long', year: '1994', place: 'A night-game stadium', bg: '14_stadium', enemy: 'modern', civ: 'modern', music: 'boss', palette: ['#0a0c10','#e05020','#f0e8d0'], status: 'hd plate', kit: 'modern', motion: null },
    { era: 'Cabinet Kingdom', year: '1989', place: 'A neon highway bursting from an arcade cabinet', bg: '15_arcade', enemy: 'modern', civ: 'modern', music: 'neon', palette: ['#0a0614','#e020a0','#40e0ff'], status: 'hd plate', kit: 'modern', motion: { kind: 'highway', speed: 340, label: '1980s neon highway' } },
    { era: 'The Glass Garage', year: 'After Hours', place: 'An unbranded hypercar garage of glass and sparks', bg: '16_garage', enemy: 'suit', civ: 'suit', music: 'neon', palette: ['#101010','#e8e8e8','#d02020'], status: 'hd plate', kit: 'suit', motion: null },
    { era: 'The Toxic Lab', year: '20XX', place: 'A dripping symbiote wing', bg: '17_lab', enemy: 'modern', civ: 'modern', music: 'boss', palette: ['#061008','#20c060','#d0ffe0'], status: 'hd plate', kit: 'modern', motion: null },
    { era: 'Crimson Nave', year: 'Horror', place: 'A cathedral of red velvet', bg: '18_nave', enemy: 'medieval', civ: 'medieval', music: 'boss', palette: ['#120408','#a01020','#f0c0c0'], status: 'hd plate', kit: 'medieval', motion: null },
    { era: 'The Sky Web', year: '2088', place: 'A tower spun in silk', bg: '19_web', enemy: 'future', civ: 'future', music: 'boss', palette: ['#08060e','#a01030','#f0d0e0'], status: 'hd plate', kit: 'future', motion: null },
    { era: 'The Foundry', year: '2140', place: 'A robot assembly line', bg: '20_foundry', enemy: 'future', civ: 'future', music: 'industrial', palette: ['#0c1016','#3a80e0','#e0f0ff'], status: 'hd plate', kit: 'future', motion: null },
    { era: 'The Assimilation Grid', year: '2166', place: 'A maglev run through the hive', bg: '21_hive', enemy: 'future', civ: 'future', music: 'future', palette: ['#05080c','#2090c0','#c0f0ff'], status: 'hd plate', kit: 'future', motion: { kind: 'maglev', speed: 380, label: 'Future maglev' } },
    { era: 'The Mind Palace', year: 'Inner', place: 'A circuit cathedral', bg: '22_mind', enemy: 'future', civ: 'future', music: 'future', palette: ['#0a0614','#c030ff','#40e0ff'], status: 'hd plate', kit: 'future', motion: null },
    { era: 'The Living Grove', year: 'Outside Time', place: 'A forest that thinks', bg: '23_grove', enemy: 'prehistoric', civ: 'woods', music: 'woods', palette: ['#08140c','#40c0a0','#e8ffe0'], status: 'hd plate', kit: 'prehistoric', motion: null },
    { era: 'Olympus Mons Docks', year: '2281', place: 'A rover chase across the red docks', bg: '24_mars', enemy: 'future', civ: 'future', music: 'future', palette: ['#1a0c08','#c04020','#f0c8a0'], status: 'hd plate', kit: 'future', motion: { kind: 'rover', speed: 240, label: 'Mars rover chase' } },
    { era: 'The Time Nexus', year: 'All / None', place: 'Where the last word hides', bg: '25_nexus', enemy: 'future', civ: 'future', music: 'future', palette: ['#04060c','#20d0ff','#ffd056'], status: 'hd plate', kit: 'future', motion: { kind: 'rift', speed: 70, label: 'Rift drift' } },
  ];

  const STAGES = META.map((m, i) => ({
    id: i + 1, word: WORDS[i], boss: BOSSES[i], ...m,
    waves: [], bossHp: 10 + Math.floor(i / 5) * 3 + (i % 5),
    bossPhases: 3,
  }));
  const SECRET_SPOTS = [
    [0.08, 0.18], [0.92, 0.16], [0.10, 0.30], [0.88, 0.22], [0.14, 0.20],
    [0.86, 0.18], [0.07, 0.26], [0.93, 0.28], [0.16, 0.14], [0.84, 0.12],
    [0.11, 0.22], [0.89, 0.24], [0.06, 0.32], [0.94, 0.20], [0.18, 0.16],
    [0.82, 0.18], [0.09, 0.28], [0.91, 0.14], [0.13, 0.18], [0.87, 0.30],
    [0.05, 0.24], [0.95, 0.22], [0.17, 0.20], [0.83, 0.16], [0.50, 0.12]
  ];
  STAGES.forEach((s, i) => {
    const sp = SECRET_SPOTS[i % SECRET_SPOTS.length];
    s.secret = { x: sp[0], y: sp[1], kind: i % 2 ? 'glyph' : 'crystal' };
    s.bossPhases = 3;
    s.weakPoints = true;
  });

  const ERA_COMIC = [
    'comic_era_woods', 'comic_era_west', 'comic_era_ancient', 'comic_era_pre',
    'comic_era_ancient', 'comic_era_ancient', 'comic_era_ancient', 'comic_era_medieval',
    'comic_era_industrial', 'comic_era_yacht', 'comic_era_pre', 'comic_era_pre',
    'comic_era_industrial', 'comic_era_stadium', 'comic_era_neon', 'comic_era_neon',
    'comic_era_lab', 'comic_era_medieval', 'comic_era_future', 'comic_era_future',
    'comic_era_future', 'comic_era_future', 'comic_era_pre', 'comic_era_future',
    'comic_era_future'
  ];
  function eraComic(stageIndex) { return ERA_COMIC[stageIndex] || 'comic_era_future'; }

  const COMICS = {
    intro: [
      {
        panels: [
          { box: [0, 0, 1, 0.42], bg: 'comic_news', bgAlign: 'top',
            speaker: 'VERA VALE', kicker: 'TIME NEWS',
            lines: ["Time News. Someone just rug-pulled the calendar.", "The rifts follow the words, not the calendar."] },
          { box: [0, 0.445, 0.49, 0.555], bg: 'comic_loss', bgAlign: 'top', bgX: 'left', charAlign: 'left', bgScale: 0.84,
            speaker: 'CHAOS',
            lines: ["That's my seed phrase. Twenty-five words.", "The paper left without me."] },
          { box: [0.51, 0.445, 0.49, 0.555], bg: 'comic_echo',
            speaker: '???',
            lines: ["Not your keys. Not your timeline."],
            cap: "The 1/1s hid one word in every era." }
        ]
      },
      {
        panels: [
          { box: [0, 0, 0.52, 0.62], bg: 'comic_news', bgAlign: 'top',
            speaker: 'VERA VALE', kicker: 'LIVE · 1987',
            lines: ["A masked man is collecting recovery words at camp.", "We do not recommend the wifi."] },
          { box: [0.54, 0, 0.46, 0.62], bg: 'comic_era_woods', char: 'boss_hockey_mask', charAlign: 'center',
            cap: "Camp Crystal, 1987. Word one." },
          { box: [0, 0.64, 1, 0.36], bg: 'comic_loss', bgAlign: 'top', bgX: 'left', charAlign: 'left', bgScale: 0.84,
            speaker: 'CHAOS',
            lines: ["Hide. Reload. Don't miss.", "And never type the phrase on a website."] }
        ]
      }
    ],
    ending: [
      {
        panels: [
          { box: [0, 0, 0.56, 1], bg: 'comic_echo', cap: 'THE ECHO' },
          { box: [0.58, 0, 0.42, 1], bg: 'comic_tab',
            speaker: 'THE ECHO',
            lines: ["Enter the phrase. Finalize the mint.", "You'll be whole again."] }
        ]
      },
      {
        panels: [
          { box: [0, 0, 0.50, 0.62], bg: 'comic_pocket', bgAlign: 'top',
            speaker: 'CHAOS',
            lines: ["Cute. You phished me with my own face.", "The paper stays paper."] },
          { box: [0.52, 0, 0.48, 0.62], bg: 'comic_news', bgAlign: 'top',
            speaker: 'VERA VALE', kicker: 'SIGNING OFF',
            lines: ["If a glowing copy of you wants your seed,", "you are the rug."] },
          { box: [0, 0.64, 1, 0.36], bg: 'comic_tab',
            speaker: 'CHAOS',
            lines: ["Phrase complete. If anyone asks you to type it,", "don't. Close the tab."],
            cap: "Time closed the tab. The twenty-five words stay off-chain." }
        ]
      }
    ]
  };

  // Pre-boss / post-boss one-liners. Short enough for a phone.
  const BANTER = [
    { pre: "If the counselor wants your seed, run.", post: "NOT. Don't frame it." },
    { pre: "This train has worse wifi than a saloon.", post: "YOUR. Not his to rustle." },
    { pre: "Gladiators, please stop shouting recovery words.", post: "KEYS. Oldest advice in the sand." },
    { pre: "A second NOT. Not a typo — a warning.", post: "NOT, again. Write it on a bone." },
    { pre: "If a tomb DMs you a form, walk away.", post: "YOUR, twice. Still don't type it." },
    { pre: "Bronze is a terrible hardware wallet.", post: "COINS. Tattoo it on a shield." },
    { pre: "Never stare. Never type. Never trust stone.", post: "NEVER is doing a lot of work." },
    { pre: "If a wizard asks you to type it, he's a ticket.", post: "TYPE. Not on the battlements." },
    { pre: "Brass wifi, clockwork phishing.", post: "THE is not filler. It's the point." },
    { pre: "Yacht wifi is still wifi.", post: "PHRASE. Don't tell the wet bar." },
    { pre: "Cold storage should be colder than this.", post: "ON the vault. Off the website." },
    { pre: "A talking forest is not a notary.", post: "A. Small word. Huge trap." },
    { pre: "If the URL winks, leave the table.", post: "WEBSITE. We left the chips." },
    { pre: "Stadium wifi is a blitz. Verify first.", post: "VERIFY. I don't do sports. I do exits." },
    { pre: "Insert coin is not a confirmation.", post: "TWICE. Custody is the real 1-UP." },
    { pre: "If it vrooms, don't type in it.", post: "GAS. Budget the fees, not the monster." },
    { pre: "If it drips and talks, it is a rug.", post: "FEES. They sting. We didn't." },
    { pre: "The choir is off-key and on-chain.", post: "STING. Stay in cover." },
    { pre: "Silk is not a firewall.", post: "RUGS. In a web. The pun did itself." },
    { pre: "Assembly lines make lousy seed vaults.", post: "PULL. He pulled punches. We didn't." },
    { pre: "Consent was not in the firmware.", post: "HARDER is a warning, not a dare." },
    { pre: "Thoughts are not confirmations.", post: "HOLD the line. I redecorated." },
    { pre: "Don't plant a seed in a talking tree.", post: "THROUGH the FUD. Not into a form." },
    { pre: "Don't celebrate on an open channel.", post: "FUD. Almost there. Stay quiet." },
    { pre: "If a copy of me asks you to type, don't.", post: "CHAOS. Phrase complete. Paper stays paper." }
  ];

  const AFTER_BEATS = [
    { vera: ["He went down swinging 'not it.'", "Close. And very masked."], chaos: ["Word one: NOT.", "The sentence already sounds like a warning."] },
    { vera: ["The cowboy tried to rustle a seed.", "YOUR keys were never his to brand."], chaos: ["Two words: NOT YOUR.", "I hate where this sentence is going."] },
    { vera: ["NOT YOUR KEYS — carved in the sand.", "Rome didn't fall. It clicked a bad link."], chaos: ["Oldest advice in the book.", "Written before books. Or gas."] },
    { vera: ["A second NOT. That's not a typo.", "The universe just hit copy-paste on the warning."], chaos: ["Not your keys. Not your bones.", "Write it twice if the era insists."] },
    { vera: ["Fire on the Nile, and another YOUR in the ash.", "If a tomb DMs you a form, walk away."], chaos: ["Two YOURs. Zero excuses.", "Don't type it."] },
    { vera: ["Spartans held the line. We held the COINS.", "Bronze is a terrible seed backup."], chaos: ["NOT YOUR KEYS, NOT YOUR COINS.", "Tattoo it on a shield."] },
    { vera: ["She turned soldiers to stone. The word is NEVER.", "Never look. Never type. Never trust a statue."], chaos: ["Never is doing a lot of work in this sentence.", "Good."] },
    { vera: ["A breached keep, a fallen mage, the verb is TYPE.", "Knights, stop shouting the phrase off the walls."], chaos: ["If a wizard asks you to type it, he is a ticket.", "Not a wizard."] },
    { vera: ["Brass London coughed up THE.", "The phrase is starting to look like a phrase."], chaos: ["THE is not filler. It's the point.", "Stay on the rails."] },
    { vera: ["Superyacht, sunset, one sheikh short of a PHRASE.", "Yacht wifi is still wifi."], chaos: ["Ten words in. The prize is the phrase.", "Not the wet-bar tablet."] },
    { vera: ["Ice age, ice boss, the word is ON.", "As in: on the vault. Off the website."], chaos: ["Cold storage should be colder than this guy.", "Word recovered."] },
    { vera: ["Deep canopy, tiny word: A.", "A website, a form, a very bad idea."], chaos: ["Small word. Huge trap.", "Keep it."] },
    { vera: ["The floor just printed WEBSITE.", "If the URL winks at you, leave the table."], chaos: ["Casino wifi, a seed in the shoe.", "We left the chips."] },
    { vera: ["Fourth and long. The only good play is VERIFY.", "Then verify again. The wifi is a blitz."], chaos: ["I don't do sports metaphors.", "I do exits."] },
    { vera: ["Cabinet signal cleared. Word TWICE recovered.", "Insert coin is not a confirmation."], chaos: ["Verify twice. High score once.", "Custody is the real 1-UP."] },
    { vera: ["Glass garage, zero logos, the word is GAS.", "Hypercars make terrible hardware wallets."], chaos: ["If it vrooms, don't type in it.", "Budget the fees."] },
    { vera: ["The lab wanted a host. The headline is FEES.", "They sting. The slime stings more."], chaos: ["If it drips and talks, it is a rug.", "Pay the fee, not the monster."] },
    { vera: ["A velvet nave, a crimson sermon, a word called STING.", "The choir was off-key and on-chain."], chaos: ["Fees sting. Rugs pull.", "Stay in cover."] },
    { vera: ["She spun a tower and a ticker: RUGS.", "Silk is not a firewall."], chaos: ["Rugs. In a web.", "I hate it when the pun does itself."] },
    { vera: ["He learned a new prime: PULL.", "Assembly lines make lousy seed vaults."], chaos: ["Rugs pull. He pulled punches. We didn't.", "Don't drop the word."] },
    { vera: ["The hive wanted a merge. The word is HARDER.", "Consent was not in the firmware."], chaos: ["Harder is a warning, not a dare.", "Shoot the orb."] },
    { vera: ["Inside the mind palace the word was HOLD.", "Thoughts are not confirmations."], chaos: ["Hold the line. Hold the paper.", "I redecorated with bullets."] },
    { vera: ["The grove thinks. The word is THROUGH.", "Walk through FUD. Don't plant a seed in a tree."], chaos: ["Through, not into the website.", "The forest needed that distinction."] },
    { vera: ["Mars docks, red dust, and a recovered FUD.", "Fear, uncertainty, and very public rover wifi."], chaos: ["Almost there.", "Don't celebrate on an open channel."] },
    { vera: ["Last word. Of course it was CHAOS.", "Time can close the tab now."], chaos: ["Phrase complete. Hide it.", "If anyone asks you to type it — don't."] }
  ];

  function afterComic(stageIndex, word) {
    const st = STAGES[stageIndex];
    const beat = AFTER_BEATS[stageIndex] || { vera: ['The word "' + word + '" just dropped back into the present.'], chaos: ['Keep moving.'] };
    const bossKey = 'boss_' + st.boss.id;
    const era = eraComic(stageIndex);
    const layout = stageIndex % 3;
    let panels;
    if (layout === 0) {
      panels = [
        { box: [0, 0, 0.38, 1], bg: era, char: bossKey, charAlign: 'center', cap: st.boss.name + '  —  DOWN' },
        { box: [0.40, 0, 0.60, 0.32], bg: 'paper', word: word, cap: 'WORD RECOVERED' },
        { box: [0.40, 0.34, 0.60, 0.36], bg: 'comic_news', bgAlign: 'face',
          speaker: 'VERA VALE', kicker: 'TIME NEWS', lines: beat.vera },
        { box: [0.40, 0.72, 0.60, 0.28], bg: 'comic_loss', bgAlign: 'top', bgX: 'left', charAlign: 'left', bgScale: 0.84,
          speaker: 'CHAOS', kicker: 'BRIEFING', lines: beat.chaos }
      ];
    } else if (layout === 1) {
      panels = [
        { box: [0, 0, 0.55, 0.58], bg: era, char: bossKey, charAlign: 'center', cap: st.boss.name + '  —  DOWN' },
        { box: [0.57, 0, 0.43, 0.58], bg: 'paper', word: word, cap: 'WORD RECOVERED' },
        { box: [0, 0.62, 1, 0.38], bg: 'comic_loss', bgAlign: 'top', bgX: 'left', charAlign: 'left', bgScale: 0.84,
          speaker: 'CHAOS', kicker: 'BRIEFING', lines: beat.chaos }
      ];
    } else {
      panels = [
        { box: [0, 0, 0.50, 0.62], bg: 'comic_news', bgAlign: 'top',
          speaker: 'VERA VALE', kicker: 'TIME NEWS', lines: beat.vera },
        { box: [0.52, 0, 0.48, 0.62], bg: era, char: bossKey, charAlign: 'center', cap: st.boss.name + '  —  DOWN' },
        { box: [0, 0.64, 0.42, 0.36], bg: 'paper', word: word, cap: 'WORD RECOVERED' },
        { box: [0.44, 0.64, 0.56, 0.36], bg: 'comic_loss', bgAlign: 'top', bgX: 'left', charAlign: 'left', bgScale: 0.84,
          speaker: 'CHAOS', lines: beat.chaos }
      ];
    }
    const pages = [{ panels: panels }];
    if (stageIndex === 24 && COMICS.ending) return pages.concat(COMICS.ending);
    return pages;
  }

  global.TPStages = { WORDS, STAGES, COMICS, afterComic, BOSSES, BANTER, AFTER_BEATS };
})(window);
