import pyttsx3

def list_voices():
    try:
        engine = pyttsx3.init()
        voices = engine.getProperty('voices')
        print(f"Total voices found: {len(voices)}")
        for index, voice in enumerate(voices):
            print(f"--- Voice {index} ---")
            print(f"ID: {voice.id}")
            print(f"Name: {voice.name}")
            print(f"Languages: {voice.languages}")
            print(f"Gender: {voice.gender}")
            print(f"Age: {voice.age}")
    except Exception as e:
        print(f"Error initializing pyttsx3: {e}")

if __name__ == "__main__":
    list_voices()
