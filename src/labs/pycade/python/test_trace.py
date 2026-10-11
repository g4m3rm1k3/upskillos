import unittest
from pathlib import Path
from tracer import trace_program

ROOT = Path(__file__).parent


def frames(trace):
    memory = {}
    for event in trace['events']:
        memory = {**memory, **event['changes']}
        yield trace['source'].splitlines()[event['line'] - 1], memory, event['changes']


class LearningTraceTests(unittest.TestCase):
    def test_q_updates_exactly_one_cell_and_matches_equation(self):
        trace = trace_program((ROOT / 'q_learning.py').read_text())
        self.assertIsNone(trace['error'])
        previous = None
        updates = 0
        for code, memory, changes in frames(trace):
            table = memory.get('q', {}).get('value')
            if 'q[state, action] =' in code:
                updates += 1
                state, action = memory['state']['value'], memory['action']['value']
                expected = memory['before']['value'] + memory['alpha']['value'] * memory['error']['value']
                self.assertAlmostEqual(table[state][action], expected)
                self.assertTrue(all(table[r][c] == previous[r][c] for r in range(64) for c in range(2) if (r, c) != (state, action)))
            if 'step_result = env.step' in code:
                self.assertEqual(memory['step_result']['length'], 5)
                self.assertEqual(memory['step_result']['items'][0]['shape'], [4])
            previous = table
        self.assertEqual(updates, 24)

    def test_a2c_gradients_and_weight_updates_are_distinct(self):
        trace = trace_program((ROOT / 'a2c.py').read_text())
        self.assertIsNone(trace['error'])
        previous_actor = None
        steps = 0
        for code, memory, changes in frames(trace):
            actor = memory.get('actor')
            if 'loss.backward()' in code:
                for name, parameter in actor['items'].items():
                    self.assertEqual(parameter['items']['weights'], previous_actor['items'][name]['items']['weights'])
                    self.assertEqual(parameter['items']['gradient']['type'], 'Tensor')
            if 'optimizer.step()' in code:
                steps += 1
                self.assertNotEqual(actor, previous_actor)
                self.assertEqual(memory['targets']['shape'], [4, 2])
            previous_actor = actor
        self.assertEqual(steps, 2)

    def test_time_limit_bootstraps_final_observation_without_crossing_resets(self):
        source = (ROOT / 'a2c.py').read_text().replace('gym.make("CartPole-v1")', 'gym.make("CartPole-v1", max_episode_steps=1)')
        trace = trace_program(source)
        self.assertIsNone(trace['error'])
        checked = 0
        for code, memory, _ in frames(trace):
            if 'running = item[' in code:
                item = memory['item']['items']
                self.assertEqual(item['truncated']['value'], [True, True])
                for i, actual in enumerate(memory['running']['value']):
                    expected = item['rewards']['value'][i] + memory['gamma']['value'] * item['next_values']['value'][i]
                    self.assertAlmostEqual(actual, expected, places=5)
                checked += 1
        self.assertEqual(checked, 8)

    def test_trace_is_bounded_and_errors_are_returned(self):
        trace = trace_program('x = 0\nwhile True:\n    x += 1\n')
        self.assertIn('Trace limit reached', trace['error'])
        self.assertLessEqual(len(trace['events']), 2500)
        broken = trace_program('x = 1\ny = 1 / 0\n')
        self.assertIn('ZeroDivisionError', broken['error'])


if __name__ == '__main__':
    unittest.main()
