"""
SonicRail – Demo Mode
Automated event cycling for judge presentations.
"""
import random
from config import EVENT_CLASSES, BLOCK_SECTIONS


class DemoEngine:
    def __init__(self):
        self.sequence = [
            "normal_ambient", "train_movement", "normal_ambient",
            "animal_intrusion", "normal_ambient", "rockfall_landslide",
            "normal_ambient", "track_fracture", "normal_ambient",
        ]
        self.index = 0
        self.running = False

    def next_event(self):
        cls = self.sequence[self.index % len(self.sequence)]
        self.index += 1
        return cls

    def random_event(self):
        return random.choice(EVENT_CLASSES)

    def start(self):
        self.running = True
        self.index = 0

    def stop(self):
        self.running = False

    def reset(self):
        self.index = 0
        self.running = False
