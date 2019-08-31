import Shepherd from 'shepherd.js'
import "./shepherd-theme-custom.css";
import { tourSteps } from "./strings";

export function buildTour() {
    let tour = new Shepherd.Tour({
        defaultStepOptions: {
            classes: 'shepherd-global',
            scrollTo: true
        }
    });

    for (let i = 0; i < tourSteps.length; i++) {
        tour.addStep('step' + i, {
            text: tourSteps[i][2],
            attachTo: {
                element: tourSteps[i][0],
                on: tourSteps[i][1],
            },
            buttons: getButtons(tour, tourSteps, i)
        });
    }

    return tour;
}

function getButtons(tour, steps, i) {
    const buttons = [];
    buttons.push({
        text: 'Close',
        classes: 'shepherd-button-secondary',
        action: function () {
            return tour.hide();
        }
    });

    if (i > 0) {
        buttons.push({
            text: 'Back',
            classes: 'shepherd-button',
            action: function () {
                return tour.back();
            }
        });
    }

    if (i != (steps.length - 1)) {
        buttons.push({
            text: 'Next',
            classes: 'shepherd-button',
            action: function () {
                return tour.next();
            }
        });
    }

    return buttons;
}