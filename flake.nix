# flake.nix
{
  description = "MIDI Controller Web Application";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            # Node.js and npm
            nodejs_20
            # Shell utilities
            watchexec  # For file watching
          ];

          shellHook = ''
            echo "MIDI Controller App Development Environment"
            echo "Node.js $(node --version)"
            echo "npm $(npm --version)"
            echo ""
            echo "Available commands:"
            echo "  npm start       - Start development server"
            echo "  npm run build   - Build for production"
            echo "  npm run lint    - Run linter"
            echo ""
          '';
        };
      }
    );
}
