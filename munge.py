#%%
text = open('my-vue-app/src/songs/dont_look_back_in_anger.txt').read()
# %%
text
# # %%
# def insert_underscores(lyrics):
#     lines = lyrics.strip().split("\n")
#     result = []
#     current_section = []

#     for line in lines:
#         if line.startswith("["):
#             if current_section:
#                 result.extend(process_section(current_section))
#                 current_section = []
#         else:
#             current_section.append(line)

#     if current_section:
#         result.extend(process_section(current_section))

#     return "\n".join(result)

# def process_section(section):
#     chord_lines = []
#     lyric_lines = []

#     for line in section:
#         if line.strip() == "":
#             continue
#         elif line[0].isalpha() and line[1].isspace():
#             chord_lines.append(line)
#         else:
#             lyric_lines.append(line)

#     result = []
#     for chords, lyrics in zip(chord_lines, lyric_lines):
#         chords = chords.split()
#         words = lyrics.split()
#         lyric_with_underscores = []
#         chord_index = 0

#         for word in words:
#             lyric_with_underscores.append(word)
#             if chord_index < len(chords) and lyrics.find(word) >= chords[chord_index].rfind(chords[chord_index][-1]):
#                 lyric_with_underscores.append("_")
#                 chord_index += 1

#         result.append(" ".join(lyric_with_underscores))

#     return result

# %%
# %%
section = []
sections = []
for line in text.split("\n"):
    if line.startswith("["):
        if section:
            sections.append(section)
            section = []
    section.append(line)
# %%
sections
# %%
def start_locs(string):
    word_starts = []
    in_word = False

    for i, char in enumerate(string):
        if char != ' ' and not in_word:
            word_starts.append(i)
            in_word = True
        elif char == ' ':
            in_word = False
    return word_starts

def insert_underscore(string, pos):
    return string[:pos] + "_" + string[pos:]
def handle_section(section):
    print(section[0])
    for i in range(1, len(section), 2):
        chords = section[i]
        lyrics = section[i + 1]
        chord_starts = start_locs(chords)
        for start in reversed(chord_starts):
            lyrics = insert_underscore(lyrics, start)
        print(chords)
        print(lyrics)
# %%
handle_section(sections[2])
# %%
# %%
for section in sections:
    handle_section(section)
# %%
print("\n".join(sections[2]))
# %%
