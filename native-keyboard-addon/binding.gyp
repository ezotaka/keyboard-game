{
  "targets": [
    {
      "target_name": "keyboard_detector",
      "sources": [],
      "conditions": [
        ["OS=='mac'", {
          "sources": [
            "src/keyboard_detector_mac.mm"
          ],
          "link_settings": {
            "libraries": [
              "-framework IOKit",
              "-framework Foundation",
              "-framework AppKit"
            ]
          },
          "xcode_settings": {
            "CLANG_CXX_LIBRARY": "libc++",
            "MACOSX_DEPLOYMENT_TARGET": "10.14",
            "GCC_ENABLE_CPP_EXCEPTIONS": "YES"
          }
        }],
        ["OS=='win'", {
          "sources": [
            "src/keyboard_detector_win.cpp"
          ],
          "libraries": [
            "user32.lib"
          ]
        }],
        ["OS=='linux'", {
          "sources": [
            "src/keyboard_detector_linux.cpp"
          ]
        }]
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "dependencies": [],
      "defines": ["NAPI_DISABLE_CPP_EXCEPTIONS"]
    }
  ]
}