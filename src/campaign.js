/* Authored campaign routes. IDs and word order remain stable for existing saves. */
(function (global) {
  const chapters = [
    { name: 'THE FRACTURE', color: '#ffc879', story: 'Follow the torn paper. The rifts follow the words, not the calendar.' },
    { name: 'THE KEEPERS', color: '#d0e6a0', story: 'The keepers have fortified the next five fragments. Break their defenses.' },
    { name: 'FALSE SIGNALS', color: '#79dfff', story: 'The Echo is hiding fragments in distractions. Read the threat before you fire.' },
    { name: 'THE INFECTION', color: '#c7a0ff', story: 'The false signal has become an infection. Cut its route to the foundry.' },
    { name: 'CLOSE THE RIFT', color: '#7dffce', story: 'Trace the signal through the hive. Recover the last words and confront the Echo.' }
  ];
  // Each route is a deliberate sequence of encounter types, not a difficulty-scaled copy.
  // [objective, encounter order, boss pattern, attack style, boss counter]
  const routes = [
    ['Reach the camp gate and recover the first fragment.', ['learn', 'shelter', 'rescue'], 'duel', 'blade', 'Cover the throw. Fire during recovery.'],
    ['Clear the train windows, then stop the word thief.', ['windows', 'crossing', 'flank'], 'precision', 'bolt', 'One aimed shot. Cover, then answer.'],
    ['Break the arena guard without hitting the spectators.', ['shield', 'rescue', 'duel'], 'duel', 'blade', 'Aim above shields. Punish the recovery.'],
    ['Track the hunters through the valley to the fourth word.', ['flank', 'crossing', 'ambush'], 'barrage', 'blade', 'Two throws. Cover until both pass.'],
    ['Protect the barge landing and reach the tomb keeper.', ['windows', 'rescue', 'shield'], 'pulse', 'orb', 'Shoot the slow energy orbs or take cover.'],
    ['Open a path through the bronze shield wall.', ['shield', 'duel', 'crossfire'], 'duel', 'blade', 'Headshots bypass the shield line.'],
    ['Read the temple ambushes and silence Medusa.', ['ambush', 'shield', 'precision'], 'pulse', 'orb', 'Deny the orbs. Aim for the exposed core.'],
    ['Breach the courtyard and draw the mage out of the keep.', ['shield', 'flank', 'siege'], 'summoner', 'orb', 'Clear the summoned guard before the mage.'],
    ['Fight along the clockwork train to its signal engine.', ['windows', 'crossfire', 'precision'], 'barrage', 'bolt', 'Wait out the burst, then break cover.'],
    ['Protect the crew and stop the yacht at the harbor rift.', ['crossing', 'rescue', 'flank'], 'precision', 'bolt', 'Watch the aim ring. Do not race the shot.'],
    ['Break the frozen sentries and find the buried signal.', ['precision', 'shield', 'ambush'], 'pulse', 'orb', 'Slow orbs can be shot out of the air.'],
    ['Follow the moving guards through the jade canopy.', ['flank', 'ambush', 'rescue'], 'summoner', 'blade', 'Remove the escort, then focus the keeper.'],
    ['Separate casino guests from the armed floor guards.', ['rescue', 'crossing', 'precision'], 'precision', 'bolt', 'Guests are blue. The aim ring is a threat.'],
    ['Stop the blitz and protect the stadium exits.', ['flank', 'crossfire', 'rescue'], 'barrage', 'bolt', 'Cover the volley. Recover between plays.'],
    ['Clear the cabinet aisles and shut down the false signal.', ['crossfire', 'precision', 'siege'], 'pulse', 'orb', 'Shoot the orbs; reload behind the cabinet.'],
    ['Clear the garage lanes without hitting the mechanics.', ['precision', 'rescue', 'crossfire'], 'precision', 'bolt', 'A clean shot beats spraying the garage.'],
    ['Cut through the lab guards to the source of the leak.', ['ambush', 'siege', 'precision'], 'pulse', 'orb', 'Deny the unstable orbs before they reach you.'],
    ['Break the nave ambush and silence its crimson keeper.', ['shield', 'ambush', 'siege'], 'summoner', 'blade', 'Clear the escort. Keep the weak point in view.'],
    ['Clear the web lanes and isolate the tower signal.', ['precision', 'flank', 'crossfire'], 'barrage', 'orb', 'Several orbs, one cover window. Do not panic-fire.'],
    ['Break the assembly guards and sever the production line.', ['shield', 'siege', 'crossfire'], 'barrage', 'bolt', 'Armor first. Reload during the recovery.'],
    ['Hold the maglev line and break the hive escort.', ['crossfire', 'flank', 'siege'], 'summoner', 'orb', 'Deny the escort before it takes an aim slot.'],
    ['Read the palace feints and find the real attack.', ['precision', 'ambush', 'duel'], 'precision', 'orb', 'Trust the countdown, not the flashing scenery.'],
    ['Protect the grove crossing and follow the final trail.', ['rescue', 'flank', 'shield'], 'summoner', 'blade', 'Spare the travelers. Remove the guard.'],
    ['Clear the rover route to the final rift.', ['windows', 'precision', 'crossfire'], 'barrage', 'bolt', 'Cover the burst before answering fire.'],
    ['Use everything you learned. Recover CHAOS and close the rift.', ['shield', 'rescue', 'crossfire', 'siege'], 'echo', 'orb', 'The Echo alternates aimed shots and orb volleys.']
  ];
  const encounters = {
    learn: { name: 'READ THE THREAT', hint: 'Shoot the red aim ring. Hold cover to reload.', roles: ['gun', 'gun'], gap: 1.7 },
    shelter: { name: 'COVER AND RETURN', hint: 'Let the shot hit cover. Then return fire.', roles: ['gun', 'gun', 'gun'], gap: 1.4 },
    windows: { name: 'CLEAR THE APPROACH', hint: 'Follow the entrances. Stay ready to cover.', roles: ['gun', 'gun', 'runner'], gap: 1.15 },
    rescue: { name: 'PROTECT THE CROSSING', hint: 'Blue badge: do not shoot. Clear the armed guards.', roles: ['gun', 'gun', 'gun'], civilian: true, gap: 1.4 },
    crossing: { name: 'TRACK THE FLANK', hint: 'Follow the moving target. Spare the traveler.', roles: ['runner', 'gun', 'runner'], civilian: true, gap: 1.25 },
    flank: { name: 'STOP THE RUNNERS', hint: 'Follow the moving target. Fire when your aim is steady.', roles: ['runner', 'gun', 'runner', 'gun'], gap: 1.05 },
    shield: { name: 'BREAK THE GUARD', hint: 'Shield: aim for the head, or break it with body hits.', roles: ['shield', 'gun', 'shield'], gap: 1.35 },
    duel: { name: 'TAKE THE OPENING', hint: 'Win one clean exchange at a time.', roles: ['gun', 'shield', 'gun'], gap: 1.8 },
    ambush: { name: 'READ THE AMBUSH', hint: 'Do not fire at movement alone. Find the red countdown.', roles: ['gun', 'runner', 'thrower', 'gun'], gap: 1.2 },
    precision: { name: 'DENY THE LONG SHOT', hint: 'Laser sight: prioritize the sniper or take cover.', roles: ['sniper', 'gun', 'sniper'], gap: 1.5 },
    crossfire: { name: 'CONTROL THE LANES', hint: 'Deny the aimed threat. Cover before the countdown ends.', roles: ['gun', 'sniper', 'runner', 'thrower'], gap: 1.2 },
    siege: { name: 'BREAK THE LAST LINE', hint: 'Clear armor, then the throwers. Use the supply drop.', roles: ['shield', 'thrower', 'gun', 'shield'], gap: 1.3 }
  };
  function buildWaves(stage, index, route) {
    const lanes = index % 2 ? [0.72, 0.28, 0.56, 0.42] : [0.28, 0.72, 0.42, 0.56];
    const beat = Math.floor(index / 5);
    return route.map((key, waveIndex) => {
      const encounter = encounters[key];
      const spawns = [];
      const tel = Math.max(0.78, 1.22 - beat * 0.08);
      encounter.roles.forEach((role, slot) => {
        const x = lanes[(slot + waveIndex) % lanes.length];
        spawns.push({ t: 0.7 + slot * encounter.gap, type: 'enemy', kind: stage.enemy,
          x, y: role === 'sniper' ? 0.64 : 0.72 + (slot % 2) * 0.07,
          scale: role === 'sniper' ? 0.78 : 0.88 + (slot % 2) * 0.06, role, tel,
          from: stage.motion ? 'vehicle' : (role === 'shield' ? 'cover' : slot % 2 ? 'door' : 'path') });
      });
      if (encounter.civilian) spawns.push({ t: 1.05, type: 'civilian', kind: stage.civ,
        x: 0.50, y: 0.83, scale: 0.82, from: 'path', hostage: true });
      // Supplies arrive before the last threat, in a distinct lower lane.
      const supply = waveIndex === 0 ? 'ammo' : waveIndex === route.length - 1 ? 'health' : ['shotgun', 'smg', 'rail'][index % 3];
      spawns.push({ t: 0.9, type: 'pickup', kind: supply, x: 0.62, y: 0.86, scale: 0.6 });
      spawns.push({ t: 1.8, type: 'bonus', kind: 'crystal', x: 0.50, y: 0.24, scale: 0.6 });
      return { name: encounter.name, hint: key === 'precision' && stage.attackStyle !== 'bolt' ? 'Long-range threat: read its countdown, then answer.' : encounter.hint, rest: waveIndex ? 0.85 : 0,
        camera: { x: (waveIndex % 2 ? 1 : -1) * 0.025, zoom: 1.06 + waveIndex * 0.025 },
        spawns: spawns.sort((a, b) => a.t - b.t) };
    });
  }
  // Match the existing painted scenes: these are a courtyard and cabinet aisles.
  const stages = global.TPStages.STAGES;
  stages[7].motion = null;
  stages[7].place = 'The fortified courtyard below the gilded keep';
  stages[14].motion = null;
  stages[14].place = 'Neon cabinet aisles around a corrupted arcade signal';
  stages.forEach((stage, i) => {
    const [objective, route, pattern, attackStyle, counter] = routes[i];
    stage.chapter = { ...chapters[Math.floor(i / 5)], id: Math.floor(i / 5) + 1 };
    stage.objective = objective;
    stage.attackStyle = attackStyle;
    stage.bossPattern = pattern;
    stage.bossCounter = counter;
    stage.bossHp = 10 + Math.floor(i / 5) * 3 + (i % 5);
    stage.waves = buildWaves(stage, i, route);
  });
  global.TPStages.CHAPTERS = chapters;
  global.TPStages.ENCOUNTERS = encounters;
})(window);
