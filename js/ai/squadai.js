/* squadai.js - Squad formation and communication */

class SquadAI {
    constructor() {
        this.squads = new Map(); // squadId -> { members, leader, formation }
        this.squadCounter = 0;
    }

    formSquad(enemies, size = C.SQUAD_SIZE) {
        const squadId = `squad_${++this.squadCounter}`;
        const members = enemies.slice(0, size);

        members.forEach((e, i) => {
            e.squadId = squadId;
            e.isSquadLeader = i === 0;
        });

        this.squads.set(squadId, {
            members,
            leader: members[0],
            alertLevel: 0,
            sharedLastKnownPos: null
        });

        return squadId;
    }

    update(enemies, player) {
        for (const [id, squad] of this.squads) {
            squad.members = squad.members.filter(m => m.isAlive);
            if (squad.members.length === 0) {
                this.squads.delete(id);
                continue;
            }

            // Share information: if any member spots player, alert all
            for (const member of squad.members) {
                if (member.alertLevel >= 0.8 && member.lastKnownPlayerPos) {
                    squad.sharedLastKnownPos = member.lastKnownPlayerPos.clone();
                    squad.alertLevel = 1.0;

                    // Alert all squad members
                    for (const other of squad.members) {
                        if (other === member) continue;
                        if (other.state === 'patrol' || other.state === 'search') {
                            other.state = 'alert';
                            other.alertLevel = 0.8;
                            other.lastKnownPlayerPos = squad.sharedLastKnownPos.clone();
                        }
                    }
                    break;
                }
            }
        }

        // Listen for squad alert events
        EventBus.on(EVENTS.ENEMY_ALERTED, ({ squadId, position }) => {
            const squad = this.squads.get(squadId);
            if (squad) {
                squad.sharedLastKnownPos = position.clone();
                squad.members.forEach(m => {
                    if (m.isAlive && m.state === 'patrol') {
                        m.state = 'alert';
                        m.lastKnownPlayerPos = position.clone();
                    }
                });
            }
        });
    }

    disbandSquad(squadId) {
        const squad = this.squads.get(squadId);
        if (squad) {
            squad.members.forEach(m => { m.squadId = null; });
            this.squads.delete(squadId);
        }
    }

    getSquadCount() { return this.squads.size; }
}
