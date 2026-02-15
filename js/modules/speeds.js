/**
 * Speeds Module
 * Maneja las velocidades de movimiento (walk, fly, swim, burrow, climb)
 */

import { setFieldValue } from '../utils/selectors.js';

export function fillSpeeds(monster) {
    if (!monster.speed) return;
    
    // Construir string de velocidad
    const speedParts = [];
    
    // Helper para extraer velocidad (puede ser número o objeto con {number, condition})
    const getSpeed = (speedValue) => {
        if (typeof speedValue === 'number') {
            return { speed: speedValue, condition: null };
        } else if (typeof speedValue === 'object' && speedValue.number) {
            return { speed: speedValue.number, condition: speedValue.condition || null };
        } else if (typeof speedValue === 'string') {
            return { speed: parseInt(speedValue), condition: null };
        }
        return null;
    };
    
    // Walk speed
    if (monster.speed.walk !== undefined) {
        const walkData = getSpeed(monster.speed.walk);
        if (walkData && walkData.speed > 0) {
            const condition = walkData.condition ? ` ${walkData.condition}` : '';
            speedParts.push(`${walkData.speed} ft.${condition}`);
        }
    }
    
    // Fly speed
    if (monster.speed.fly) {
        const flyData = getSpeed(monster.speed.fly);
        if (flyData) {
            // Usar la condición del objeto si existe, sino verificar canHover
            let condition = flyData.condition || '';
            if (!condition && monster.speed.canHover) {
                condition = '(hover)';
            }
            const conditionStr = condition ? ` ${condition}` : '';
            speedParts.push(`fly ${flyData.speed} ft.${conditionStr}`);
        }
    }
    
    // Swim speed
    if (monster.speed.swim) {
        const swimData = getSpeed(monster.speed.swim);
        if (swimData) {
            const condition = swimData.condition ? ` ${swimData.condition}` : '';
            speedParts.push(`swim ${swimData.speed} ft.${condition}`);
        }
    }
    
    // Burrow speed
    if (monster.speed.burrow) {
        const burrowData = getSpeed(monster.speed.burrow);
        if (burrowData) {
            const condition = burrowData.condition ? ` ${burrowData.condition}` : '';
            speedParts.push(`burrow ${burrowData.speed} ft.${condition}`);
        }
    }
    
    // Climb speed
    if (monster.speed.climb) {
        const climbData = getSpeed(monster.speed.climb);
        if (climbData) {
            const condition = climbData.condition ? ` ${climbData.condition}` : '';
            speedParts.push(`climb ${climbData.speed} ft.${condition}`);
        }
    }
    
    const speedString = speedParts.join(', ');
    console.log('Speed:', speedString);
    
    setFieldValue('#creature_speed', speedString);
}