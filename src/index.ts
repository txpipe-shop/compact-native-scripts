import { NativeScriptSchema } from './schema';

// Test 1: "any" type with multiple sig scripts
const jsonAny = {
  scripts: [
    { keyHash: 'a1b2c3d4e5f6789012345678abcdef0123456789abcdef0123456789abcdef01', type: 'sig' },
    { keyHash: 'b2c3d4e5f6789012345678abcdef0123456789abcdef0123456789abcdef0123', type: 'sig' },
    { keyHash: 'c3d4e5f6789012345678abcdef0123456789abcdef0123456789abcdef012345', type: 'sig' },
  ],
  type: 'any',
};

// Test 2: "atLeast" type with required field
const jsonAtLeast = {
  scripts: [
    { keyHash: 'd4e5f6789012345678abcdef0123456789abcdef0123456789abcdef01234567', type: 'sig' },
    { keyHash: 'e5f6789012345678abcdef0123456789abcdef0123456789abcdef0123450123', type: 'sig' },
    { keyHash: 'f6789012345678abcdef0123456789abcdef0123456789abcdef0123456789ab', type: 'sig' },
    { keyHash: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', type: 'sig' },
  ],
  required: 2,
  type: 'atLeast',
};

// Test 3: Nested script (atLeast containing all containing sigs)
const jsonNested = {
  type: 'atLeast',
  required: 2,
  scripts: [
    {
      type: 'all',
      scripts: [
        { keyHash: 'a1b2c3d4e5f6789012345678abcdef0123456789abcdef0123456789abcdef01', type: 'sig' },
        { keyHash: 'b2c3d4e5f6789012345678abcdef0123456789abcdef0123456789abcdef0100', type: 'sig' },
      ],
    },
    { keyHash: 'c3d4e5f6789012345678abcdef0123456789abcdef0123456789abcdef010000', type: 'sig' },
  ],
};

function test(name: string, json: unknown) {
  const result = NativeScriptSchema.safeParse(json);
  if (result.success) {
    console.log(`✅ ${name}: Valid`);
  } else {
    console.error(`❌ ${name}:`, result.error.format());
  }
}

function main() {
  console.log('Testing native script schemas...\n');
  test('any type', jsonAny);
  test('atLeast type', jsonAtLeast);
  test('nested script', jsonNested);
  test('single sig script', {
    keyHash: 'd92b712d1882c3b0f75b6f677e0b2cbef4fbc8b8121bb9dde324ff09abcdef01',
    type: 'sig',
  });
}

main();
