import os

keywords = ["Color", "Roughness", "Metalness", "AmbientOcclusion", "NormalGL", "Emissive"]

def rename_files(folder_path):
    renamed_count = 0

    for root, dirs, files in os.walk(folder_path):
        for filename in files:
            file_path = os.path.join(root, filename)
            new_filename = capitalize_keywords(filename)
            new_filename = capitalize_after_underscore(new_filename)
            
            if new_filename != filename:
                new_file_path = os.path.join(root, new_filename)
                os.rename(file_path, new_file_path)
                print(f'Renamed: {file_path} -> {new_file_path}')
                renamed_count += 1

    print(f'Total files renamed: {renamed_count}')

def capitalize_keywords(filename):
    for keyword in keywords:
        lowercase_keyword = keyword.lower()
        if lowercase_keyword in filename.lower():
            # Check if the keyword is not already in the correct casing
            if keyword not in filename:
                filename = filename.replace(lowercase_keyword, keyword)
    return filename

def capitalize_after_underscore(filename):
    parts = filename.split("_")
    capitalized_parts = []
    for part in parts:
        capitalized_parts.append(part[0].upper() + part[1:])

    final_name = "_".join(capitalized_parts)

    return final_name

# Get the directory of the current script
script_directory = os.path.dirname(__file__)
rename_files(script_directory)
