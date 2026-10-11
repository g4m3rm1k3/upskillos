import unittest
from pathlib import Path
from tracer import trace_program

ROOT = Path(__file__).parent


def frames(trace):
    memory = {}
    for event in trace['events']:
        memory = {**memory, **event['changes']}
        for name in event.get('removed', []):
            memory.pop(name, None)
        yield trace['source'].splitlines()[event['line'] - 1], memory, event['changes']


class LearningTraceTests(unittest.TestCase):
    def test_unannotated_functions_methods_and_return_values(self):
        source = '''class Learner:
    def __init__(self, weight):
        self.weight = weight
    def predict(self, x):
        temporary = x * self.weight
        return temporary, x, 3, 4, 5
def outer(value):
    model = Learner(2)
    result = model.predict(value)
    return result
value = 7
result = outer(value)
print(result, end="")
env = "this is not a Gymnasium environment"
'''
        trace = trace_program(source)
        self.assertIsNone(trace['error'])
        self.assertEqual(trace['stdout'], '(14, 7, 3, 4, 5)')
        called = [event for event in trace['events'] if event['function'] == 'predict']
        self.assertTrue(called)
        self.assertEqual(called[-1]['stack'], ['<module>', 'outer', 'predict'])
        self.assertEqual(called[-1]['changes']['return value']['items'][0]['value'], 14)
        last_memory = list(frames(trace))[-1][1]
        self.assertNotIn('temporary', last_memory)
        self.assertNotIn('self', last_memory)
        self.assertNotIn('return value', last_memory)
        self.assertEqual(last_memory['value']['value'], 7)
        self.assertIn('value', trace['metadata']['12']['reads'])

    def test_bounded_previews_nonfinite_and_recursive_containers(self):
        trace = trace_program('import numpy as np\nx = np.arange(10000).reshape(100, 100)\nbad = np.array([float("nan"), float("inf")])\ncycle = []\ncycle.append(cycle)\n')
        self.assertIsNone(trace['error'])
        memory = list(frames(trace))[-1][1]
        self.assertEqual(memory['x']['shape'], [100, 100])
        self.assertEqual(len(memory['x']['value']), 256)
        self.assertEqual(memory['x']['preview'], 'flat first 256 elements')
        self.assertEqual(memory['bad']['value'], ['nan', 'inf'])

    def test_new_examples_learn_and_average_correctly(self):
        for name in ['regression', 'classifier']:
            trace = trace_program((ROOT / f'{name}.py').read_text())
            self.assertIsNone(trace['error'])
            memory = list(frames(trace))[-1][1]
            losses = [node['value'] for node in memory['losses']['items']]
            self.assertLess(losses[-1], losses[0])
        self.assertEqual(memory['predictions']['value'], memory['labels']['value'])
        trace = trace_program((ROOT / 'bandit.py').read_text())
        self.assertIsNone(trace['error'])
        totals, counts = [0, 0, 0], [0, 0, 0]
        for code, memory, _ in frames(trace):
            if 'estimates[action] =' in code:
                action = memory['action']['value']
                totals[action] += memory['reward']['value']
                counts[action] += 1
                self.assertAlmostEqual(memory['estimates']['value'][action], totals[action] / counts[action])

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
