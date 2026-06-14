import re

share_code = "u2x1-3x2h0e10_51-1e15_3p4i5x3s1x2"

# Current regex
current_pattern = r'h([^\-dsu]+(?:-[^\-dsu]+)*)'
# Proposed regex
proposed_pattern = r'h([^\-dsui]+(?:-[^\-dsui]+)*)'

current_match = re.search(current_pattern, share_code)
proposed_match = re.search(proposed_pattern, share_code)

print("Input Share Code:", share_code)
if current_match:
    print("Current Regex Match:", current_match.group(0))
    print("Current Captured Section:", current_match.group(1))
    print("Current split heroes list:", current_match.group(1).split('-'))
else:
    print("Current Regex Match: None")

if proposed_match:
    print("Proposed Regex Match:", proposed_match.group(0))
    print("Proposed Captured Section:", proposed_match.group(1))
    print("Proposed split heroes list:", proposed_match.group(1).split('-'))
else:
    print("Proposed Regex Match: None")
